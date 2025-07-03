-- Create enum for book condition
CREATE TYPE book_condition AS ENUM ('excellent', 'good', 'fair', 'poor');

-- Create enum for book status
CREATE TYPE book_status AS ENUM ('available', 'borrowed', 'for_sale', 'not_available');

-- Create enum for borrow request status
CREATE TYPE request_status AS ENUM ('pending', 'approved', 'rejected', 'returned');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  location TEXT,
  bio TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create books table
CREATE TABLE public.books (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL,
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  isbn TEXT,
  genre TEXT,
  description TEXT,
  condition book_condition NOT NULL DEFAULT 'good',
  status book_status NOT NULL DEFAULT 'available',
  cover_image_url TEXT,
  publication_year INTEGER,
  pages INTEGER,
  start_date DATE DEFAULT CURRENT_DATE,
  due_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create borrow_requests table
CREATE TABLE public.borrow_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  book_id UUID NOT NULL,
  borrower_id UUID NOT NULL,
  lender_id UUID NOT NULL,
  status request_status NOT NULL DEFAULT 'pending',
  requested_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  approved_date TIMESTAMP WITH TIME ZONE,
  due_date TIMESTAMP WITH TIME ZONE,
  returned_date TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create reading_progress table
CREATE TABLE public.reading_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  book_id UUID NOT NULL,
  pages_read INTEGER DEFAULT 0,
  total_pages INTEGER,
  status TEXT DEFAULT 'not_started',
  started_date TIMESTAMP WITH TIME ZONE,
  finished_date TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, book_id)
);

-- Create notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  borrow_request_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add foreign key constraints
ALTER TABLE public.books ADD CONSTRAINT fk_books_owner FOREIGN KEY (owner_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;
ALTER TABLE public.borrow_requests ADD CONSTRAINT fk_borrow_requests_book FOREIGN KEY (book_id) REFERENCES public.books(id) ON DELETE CASCADE;
ALTER TABLE public.borrow_requests ADD CONSTRAINT fk_borrow_requests_borrower FOREIGN KEY (borrower_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;
ALTER TABLE public.borrow_requests ADD CONSTRAINT fk_borrow_requests_lender FOREIGN KEY (lender_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;
ALTER TABLE public.reading_progress ADD CONSTRAINT fk_reading_progress_user FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;
ALTER TABLE public.reading_progress ADD CONSTRAINT fk_reading_progress_book FOREIGN KEY (book_id) REFERENCES public.books(id) ON DELETE CASCADE;
ALTER TABLE public.notifications ADD CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;
ALTER TABLE public.notifications ADD CONSTRAINT fk_notifications_borrow_request FOREIGN KEY (borrow_request_id) REFERENCES public.borrow_requests(id) ON DELETE CASCADE;

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.borrow_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reading_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for profiles
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create RLS policies for books
CREATE POLICY "Users can view all available books" ON public.books FOR SELECT USING (true);
CREATE POLICY "Users can manage their own books" ON public.books FOR ALL USING (auth.uid() = owner_id);

-- Create RLS policies for borrow_requests
CREATE POLICY "Users can view their own borrow requests" ON public.borrow_requests FOR SELECT USING (auth.uid() = borrower_id OR auth.uid() = lender_id);
CREATE POLICY "Users can create borrow requests" ON public.borrow_requests FOR INSERT WITH CHECK (auth.uid() = borrower_id);
CREATE POLICY "Lenders can update their requests" ON public.borrow_requests FOR UPDATE USING (auth.uid() = lender_id);

-- Create RLS policies for reading_progress
CREATE POLICY "Users can view their own reading progress" ON public.reading_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own reading progress" ON public.reading_progress FOR ALL USING (auth.uid() = user_id);

-- Create RLS policies for notifications
CREATE POLICY "Users can view their own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_books_updated_at BEFORE UPDATE ON public.books FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_borrow_requests_updated_at BEFORE UPDATE ON public.borrow_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_reading_progress_updated_at BEFORE UPDATE ON public.reading_progress FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', 'New User'));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Add NOT NULL constraint to start_date and due_date
ALTER TABLE public.books
ALTER COLUMN start_date SET NOT NULL,
ALTER COLUMN due_date SET NOT NULL;