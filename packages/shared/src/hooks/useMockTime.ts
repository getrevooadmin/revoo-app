"use client";

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export function useMockTime(apiEndpoint: string = '/api/dev/mock-time') {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['mock-time'],
    queryFn: async () => {
      const res = await fetch(apiEndpoint);
      return res.json();
    },
    refetchInterval: 10000
  });

  const setMockTimeMutation = useMutation({
    mutationFn: async (mockDate: string) => {
      const res = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mockDate })
      });
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['mock-time'] })
  });

  const advanceMockTimeMutation = useMutation({
    mutationFn: async (hours: number = 24) => {
      const res = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hours })
      });
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['mock-time'] })
  });

  const resetMockTimeMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(apiEndpoint, { method: 'DELETE' });
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['mock-time'] })
  });

  return {
    mockTime: query.data?.mockDate || null,
    isOverridden: !!query.data?.isOverridden,
    isLoading: query.isLoading,
    isError: query.isError,
    setMockTime: setMockTimeMutation.mutateAsync,
    advanceMockTime: advanceMockTimeMutation.mutateAsync,
    resetMockTime: resetMockTimeMutation.mutateAsync
  };
}
