# UniRide Supabase PostgreSQL Schema DDL

This document outlines the complete database schema for the **UniRide** peer-to-peer carpooling system. It is fully optimized for **Supabase**, leveraging custom PostgreSQL types/enums, triggers, constraints, Row Level Security (RLS) policies, and high-performance indexes.

---

## 1. Custom Types & Enums

We define the static types and enums used across profiles, vehicles, trips, and ride requests:

```sql
-- 1. Custom Enums
CREATE TYPE public.GENDER_TYPE AS ENUM ('Male', 'Female', 'Other');
CREATE TYPE public.ENGINE_TYPE AS ENUM ('Gasoline', 'Electric', 'Hybrid');
CREATE TYPE public.TRIP_STATUS AS ENUM ('Open', 'Full', 'Completed', 'Cancelled');
CREATE TYPE public.REQUEST_STATUS AS ENUM ('Pending', 'Accepted', 'Rejected', 'Counter_Offered');
CREATE TYPE public.TRIP_ROLE AS ENUM ('Driver', 'Rider');
```

---

## 2. Table Definitions

### Profiles Table
Tracks student demographic details, verification statuses, and historical statistics. It references Supabase's built-in `auth.users` table.

```sql
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name VARCHAR(255) NOT NULL,
  university VARCHAR(255) NOT NULL,
  gender public.GENDER_TYPE NOT NULL,
  phone_number VARCHAR(20) NOT NULL,
  student_email VARCHAR(255) UNIQUE NOT NULL,
  profile_picture_url TEXT,
  university_card_url TEXT,
  is_verified BOOLEAN DEFAULT FALSE,
  total_rides_count INT DEFAULT 0,
  km_shared DECIMAL(10,2) DEFAULT 0.00,
  avg_rating DECIMAL(3,2) DEFAULT 5.00,
  bio TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### Vehicles Table
Stores vehicle records mapped to their owner's profile.

```sql
CREATE TABLE public.vehicles (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  make VARCHAR(100) NOT NULL,
  model VARCHAR(100) NOT NULL,
  color VARCHAR(50) NOT NULL,
  license_plate VARCHAR(50) UNIQUE NOT NULL,
  engine_type public.ENGINE_TYPE DEFAULT 'Gasoline' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### Trips Table
Tracks carpool listings published by drivers using the "Drive" flow.

```sql
CREATE TABLE public.trips (
  id BIGSERIAL PRIMARY KEY,
  driver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  vehicle_id BIGINT REFERENCES public.vehicles(id) ON DELETE SET NULL,
  origin_name TEXT NOT NULL,
  destination_name TEXT NOT NULL,
  selected_route_option VARCHAR(50) NOT NULL,
  distance_km DECIMAL(6,2) NOT NULL,
  duration_mins INT NOT NULL,
  route_geometry JSONB NOT NULL,
  departure_time TIMESTAMPTZ NOT NULL,
  total_seats INT NOT NULL,
  available_seats INT NOT NULL,
  base_fare DECIMAL(10,2) NOT NULL,
  total_estimated_earnings DECIMAL(10,2) GENERATED ALWAYS AS (base_fare * total_seats) STORED,
  status public.TRIP_STATUS DEFAULT 'Open' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  
  -- Constraints
  CONSTRAINT check_seats CHECK (available_seats <= total_seats)
);
```

### Ride Requests Table
Manages passenger join requests and the corresponding fare negotiation process.

```sql
CREATE TABLE public.ride_requests (
  id BIGSERIAL PRIMARY KEY,
  trip_id BIGINT NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  passenger_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  original_fare DECIMAL(10,2) NOT NULL,
  proposed_fare DECIMAL(10,2) NOT NULL,
  status public.REQUEST_STATUS DEFAULT 'Pending' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

> [!NOTE]
> Standard SQL check constraints cannot contain subqueries, making a direct check like `CHECK (passenger_id != (SELECT driver_id FROM trips WHERE id = trip_id))` invalid in PostgreSQL. We enforce this constraint using a custom database trigger instead.

### Reviews Table
Stores reviews submitted by users following a completed trip.

```sql
CREATE TABLE public.reviews (
  id BIGSERIAL PRIMARY KEY,
  trip_id BIGINT NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reviewee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role public.TRIP_ROLE NOT NULL,
  rating_stars INT NOT NULL CONSTRAINT check_rating CHECK (rating_stars BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## 3. Database Triggers & Functions

### Trigger 1: Auto-Creating Profile on Signup
Integrates directly with Supabase Auth (`auth.users`) to automatically populate our `profiles` table when a new student signs up.

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, student_email, full_name, university, gender, phone_number, is_verified)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', ''),
    COALESCE(new.raw_user_meta_data->>'university', 'DHA Suffa University'),
    COALESCE((new.raw_user_meta_data->>'gender')::public.GENDER_TYPE, 'Other'),
    COALESCE(new.raw_user_meta_data->>'phone_number', ''),
    FALSE -- defaults to unverified
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### Trigger 2: Prevent Self-Riding
Enforces the access rule that a user cannot request to join their own trip.

```sql
CREATE OR REPLACE FUNCTION public.check_prevent_self_riding()
RETURNS trigger AS $$
DECLARE
  trip_driver_id UUID;
BEGIN
  SELECT driver_id INTO trip_driver_id FROM public.trips WHERE id = new.trip_id;
  IF new.passenger_id = trip_driver_id THEN
    RAISE EXCEPTION 'A user cannot request to join their own trip as a passenger.';
  END IF;
  RETURN new;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER before_ride_request_inserted
  BEFORE INSERT OR UPDATE ON public.ride_requests
  FOR EACH ROW EXECUTE FUNCTION public.check_prevent_self_riding();
```

### Trigger 3: Update Profile Rating & Reviews Summary
Recalculates a student's `avg_rating` automatically whenever a review is added or updated.

```sql
CREATE OR REPLACE FUNCTION public.update_profile_rating()
RETURNS trigger AS $$
BEGIN
  UPDATE public.profiles
  SET avg_rating = COALESCE(
    (SELECT ROUND(AVG(rating_stars)::numeric, 2) FROM public.reviews WHERE reviewee_id = new.reviewee_id),
    5.00
  )
  WHERE id = new.reviewee_id;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_review_inserted
  AFTER INSERT OR UPDATE OR DELETE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_profile_rating();
```

### Trigger 4: Update Profile Rides & Shared Mileage
Automatically increments the `total_rides_count` and sums up the `km_shared` for both the driver and all accepted passengers when a trip's status transitions to `Completed`.

```sql
CREATE OR REPLACE FUNCTION public.update_profile_rides_and_km()
RETURNS trigger AS $$
BEGIN
  -- Check if trip status has transitioned to 'Completed'
  IF (new.status = 'Completed' AND old.status != 'Completed') THEN
    -- Update driver profile stats
    UPDATE public.profiles
    SET 
      total_rides_count = total_rides_count + 1,
      km_shared = km_shared + COALESCE(new.distance_km, 0)
    WHERE id = new.driver_id;

    -- Update all accepted passengers' profiles
    UPDATE public.profiles
    SET
      total_rides_count = total_rides_count + 1,
      km_shared = km_shared + COALESCE(new.distance_km, 0)
    WHERE id IN (
      SELECT passenger_id 
      FROM public.ride_requests 
      WHERE trip_id = new.id AND status = 'Accepted'
    );
  END IF;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_trip_status_completed
  AFTER UPDATE OF status ON public.trips
  FOR EACH ROW EXECUTE FUNCTION public.update_profile_rides_and_km();
```

### RPC Function: Reset User Password
Updates a user's password in the `auth.users` table. This function runs with `SECURITY DEFINER` privileges to allow updating auth credentials from the public schema (called via Supabase RPC).

```sql
CREATE OR REPLACE FUNCTION public.reset_user_password(user_email text, new_password text)
RETURNS boolean AS $$
DECLARE
  updated_rows int;
BEGIN
  -- Update user password in auth.users by encrypting with crypt and blowfish salt
  UPDATE auth.users
  SET encrypted_password = crypt(new_password, gen_salt('bf'))
  WHERE email = LOWER(TRIM(user_email));
  
  GET DIAGNOSTICS updated_rows = ROW_COUNT;
  
  IF updated_rows > 0 THEN
    RETURN TRUE;
  ELSE
    RETURN FALSE;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 4. High-Performance Indexing Strategy

To make sure the ride feed loads immediately during sorting, advanced filtering, and coordinate lookups, the following index design is applied:

```sql
-- 1. Index on Trips for filtering Open trips and sorting by cheapest price
CREATE INDEX idx_trips_open_fare 
ON public.trips (status, base_fare) 
WHERE status = 'Open';

-- 2. Foreign Key Indexes to optimize JOIN paths between trips, profiles, and vehicles
CREATE INDEX idx_trips_driver_id ON public.trips (driver_id);
CREATE INDEX idx_trips_vehicle_id ON public.trips (vehicle_id);

-- 3. Composite Index on Profiles to fetch gender and university filters during JOINs
CREATE INDEX idx_profiles_uni_gender ON public.profiles (university, gender);

-- 4. Index on Vehicles engine type for category filtering (ICE vs EV vs Hybrid)
CREATE INDEX idx_vehicles_engine ON public.vehicles (engine_type);

-- 5. Index on Ride Requests trip_id and passenger_id to speed up dashboard calculations
CREATE INDEX idx_ride_requests_trip ON public.ride_requests (trip_id);
CREATE INDEX idx_ride_requests_passenger ON public.ride_requests (passenger_id);
```

### Optimization Analysis
* **Cheapest Price Sort**: `idx_trips_open_fare` handles `ORDER BY base_fare ASC` on `status = 'Open'` queries in $O(\log N)$ time, avoiding costly full-table sorts.
* **Gender Restriction Filter**: `idx_profiles_uni_gender` makes joining `trips` with `profiles` on `driver_id` and filtering by the driver's university and gender extremely fast.
* **Vehicle Engine Filter**: `idx_vehicles_engine` accelerates the join filter on engine type (`Gasoline`/`Electric`/`Hybrid`).

---

## 5. Row Level Security (RLS) Policies

Enable security boundaries across all tables so that users can access only their authorized data slices:

```sql
-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ride_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- 1. Profiles Policies
CREATE POLICY "Profiles are readable by authenticated users" 
  ON public.profiles FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can update their own profile" 
  ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- 2. Vehicles Policies
CREATE POLICY "Vehicles are viewable by authenticated users" 
  ON public.vehicles FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can register their own vehicles" 
  ON public.vehicles FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update/delete their own vehicles" 
  ON public.vehicles FOR ALL USING (auth.uid() = user_id);

-- 3. Trips Policies
CREATE POLICY "Trips are viewable by authenticated users" 
  ON public.trips FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can list a trip" 
  ON public.trips FOR INSERT WITH CHECK (auth.uid() = driver_id);

CREATE POLICY "Drivers can update/cancel their own trips" 
  ON public.trips FOR UPDATE USING (auth.uid() = driver_id);

-- 4. Ride Requests Policies
CREATE POLICY "Users can view requests they sent or received" 
  ON public.ride_requests FOR SELECT USING (
    auth.uid() = passenger_id OR 
    auth.uid() = (SELECT driver_id FROM public.trips WHERE id = trip_id)
  );

CREATE POLICY "Passengers can insert ride requests" 
  ON public.ride_requests FOR INSERT WITH CHECK (auth.uid() = passenger_id);

CREATE POLICY "Passengers or Drivers can edit requests" 
  ON public.ride_requests FOR UPDATE USING (
    auth.uid() = passenger_id OR 
    auth.uid() = (SELECT driver_id FROM public.trips WHERE id = trip_id)
  );

-- 5. Reviews Policies
CREATE POLICY "Reviews are viewable by everyone" 
  ON public.reviews FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can write reviews for trips they participated in" 
  ON public.reviews FOR INSERT WITH CHECK (
    auth.uid() = reviewer_id AND (
      auth.uid() = (SELECT driver_id FROM public.trips WHERE id = trip_id) OR
      auth.uid() IN (SELECT passenger_id FROM public.ride_requests WHERE trip_id = trip_id AND status = 'Accepted')
    )
  );
```
