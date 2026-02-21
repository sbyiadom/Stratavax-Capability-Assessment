import { useEffect, useState } from 'react';
import { supabase } from '../../supabase/client';
import { useRouter } from 'next/router';

export default function SessionDebug() {
  const router = useRouter();
  const [supabaseSession, setSupabaseSession] = useState(null);
  const [localStorageData, setLocalStorageData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      // Check Supabase session
      const { data: { session } } = await supabase.auth.getSession();
      setSupabaseSession(session);

      // Check localStorage
      const supervisorSession = localStorage.getItem('supervisorSession');
      try {
        setLocalStorageData(JSON.parse(supervisorSession));
      } catch {
        setLocalStorageData({ raw: supervisorSession });
      }

      setLoading(false);
    };

    checkSession();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('supervisorSession');
    router.push('/supervisor-login');
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>Session Debug Page</h1>
      
      <h2>Supabase Session:</h2>
      <pre style={{ background: '#f0f0f0', padding: '10px', borderRadius: '5px' }}>
        {JSON.stringify(supabaseSession, null, 2)}
      </pre>

      <h2>LocalStorage Data:</h2>
      <pre style={{ background: '#f0f0f0', padding: '10px', borderRadius: '5px' }}>
        {JSON.stringify(localStorageData, null, 2)}
      </pre>

      <button 
        onClick={handleLogout}
        style={{
          padding: '10px 20px',
          background: '#dc2626',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: 'pointer',
          marginTop: '20px'
        }}
      >
        Logout
      </button>
    </div>
  );
}
