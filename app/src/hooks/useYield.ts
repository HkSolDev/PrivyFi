import { useState, useEffect } from 'react';

export function useYield() {
  const [strategies, setStrategies] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchYields = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/yield');
      if (!response.ok) {
        throw new Error('Failed to fetch yield strategies');
      }
      const data = await response.json();
      setStrategies(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchYields();
  }, []);

  return { strategies, loading, error, refresh: fetchYields };
}
