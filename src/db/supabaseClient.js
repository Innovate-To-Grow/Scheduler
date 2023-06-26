import { createClient } from "@supabase/supabase-js";
const supabase = createClient(
    'https://kepecekllppqkkhzlgit.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtlcGVjZWtsbHBwcWtraHpsZ2l0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE2Nzc3ODU1MzIsImV4cCI6MTk5MzM2MTUzMn0.8OM83NZbdFq1xRWg_1R45pujM7lkzKDmNHIvBAwmh2A'
)
export default supabase;

