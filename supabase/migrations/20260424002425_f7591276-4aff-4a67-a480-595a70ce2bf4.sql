ALTER TABLE public.registros REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.registros;