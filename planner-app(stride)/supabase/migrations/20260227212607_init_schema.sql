-- Create users table (extends supabase auth.users if needed, or standalone)
CREATE TABLE public.users (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create projects table
CREATE TABLE public.projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create tags table
CREATE TABLE public.tags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  color TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create tasks table
CREATE TABLE public.tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  tag_id UUID REFERENCES public.tags(id) ON DELETE RESTRICT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  is_priority BOOLEAN DEFAULT FALSE NOT NULL,
  is_done BOOLEAN DEFAULT FALSE NOT NULL,
  due_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies
CREATE POLICY "Users can view own user record" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own user record" ON public.users FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can manage their own projects" ON public.projects FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own tags" ON public.tags FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own tasks" ON public.tasks FOR ALL USING (auth.uid() = user_id);

-- Create weekly_journal table
CREATE TABLE public.weekly_journal (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  week_key TEXT NOT NULL,
  takeaway TEXT,
  proud_of TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, week_key)
);

ALTER TABLE public.weekly_journal ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own weekly journal" ON public.weekly_journal FOR ALL USING (auth.uid() = user_id);

-- Create weekly_goals table
CREATE TABLE public.weekly_goals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  week_key TEXT NOT NULL,
  goal_1 TEXT,
  goal_2 TEXT,
  goal_3 TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, week_key)
);

ALTER TABLE public.weekly_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own weekly goals" ON public.weekly_goals FOR ALL USING (auth.uid() = user_id);

-- Create monthly_milestones table
CREATE TABLE public.monthly_milestones (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  month_key TEXT NOT NULL,
  milestone TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.monthly_milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own monthly milestones" ON public.monthly_milestones FOR ALL USING (auth.uid() = user_id);
