-- Create table for planned nights (the overall plan)
CREATE TABLE public.planned_nights (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL DEFAULT 'My Night Out',
  planned_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'completed', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for planned stops (venues within a planned night)
CREATE TABLE public.planned_stops (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  planned_night_id UUID NOT NULL REFERENCES public.planned_nights(id) ON DELETE CASCADE,
  venue_id UUID NOT NULL,
  start_time TIME WITHOUT TIME ZONE NOT NULL,
  end_time TIME WITHOUT TIME ZONE NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.planned_nights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planned_stops ENABLE ROW LEVEL SECURITY;

-- RLS policies for planned_nights
CREATE POLICY "Users can view their own planned nights" 
ON public.planned_nights 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own planned nights" 
ON public.planned_nights 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own planned nights" 
ON public.planned_nights 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own planned nights" 
ON public.planned_nights 
FOR DELETE 
USING (auth.uid() = user_id);

-- RLS policies for planned_stops (access through planned_night ownership)
CREATE POLICY "Users can view stops in their planned nights" 
ON public.planned_stops 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.planned_nights pn 
  WHERE pn.id = planned_night_id AND pn.user_id = auth.uid()
));

CREATE POLICY "Users can create stops in their planned nights" 
ON public.planned_stops 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.planned_nights pn 
  WHERE pn.id = planned_night_id AND pn.user_id = auth.uid()
));

CREATE POLICY "Users can update stops in their planned nights" 
ON public.planned_stops 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM public.planned_nights pn 
  WHERE pn.id = planned_night_id AND pn.user_id = auth.uid()
));

CREATE POLICY "Users can delete stops in their planned nights" 
ON public.planned_stops 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM public.planned_nights pn 
  WHERE pn.id = planned_night_id AND pn.user_id = auth.uid()
));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_planned_nights_updated_at
BEFORE UPDATE ON public.planned_nights
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();