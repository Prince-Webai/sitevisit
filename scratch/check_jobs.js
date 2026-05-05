
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkJobs() {
  const { data, error } = await supabase
    .from('jobs')
    .select('*');
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log('Total jobs:', data.length);
  console.log('Jobs scheduled today:', data.filter(j => {
    const today = new Date().toISOString().split('T')[0];
    return j.scheduled_date?.startsWith(today);
  }).length);
  
  console.log('Job statuses:', data.reduce((acc, j) => {
    acc[j.status] = (acc[j.status] || 0) + 1;
    return acc;
  }, {}));

  console.log('Sample job scheduled_date values:', data.map(j => j.scheduled_date).filter(Boolean).slice(0, 5));
}

checkJobs();
