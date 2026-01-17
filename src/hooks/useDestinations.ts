import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, Enums } from "@/integrations/supabase/types";

export type Destination = Tables<"destinations">;
export type DestinationType = Enums<"destination_type">;
export type DestinationInsert = TablesInsert<"destinations">;

export function useDestinations() {
  return useQuery({
    queryKey: ["destinations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("destinations")
        .select("*")
        .order("name");
      if (error) throw error;
      return data as Destination[];
    },
  });
}

export function useDestination(id: string) {
  return useQuery({
    queryKey: ["destinations", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("destinations")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as Destination;
    },
    enabled: !!id,
  });
}

export function useDestinationStats() {
  return useQuery({
    queryKey: ["destination_stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("destinations")
        .select("is_active");
      
      if (error) throw error;
      
      const active = data?.filter(d => d.is_active).length || 0;
      const inactive = data?.filter(d => !d.is_active).length || 0;
      
      return { active, inactive, total: data?.length || 0 };
    },
  });
}

export function useCreateDestination() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (destination: DestinationInsert) => {
      const { data, error } = await supabase
        .from("destinations")
        .insert(destination)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["destinations"] });
      queryClient.invalidateQueries({ queryKey: ["destination_stats"] });
    },
  });
}

export function useUpdateDestination() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Destination> & { id: string }) => {
      const { data, error } = await supabase
        .from("destinations")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["destinations"] });
      queryClient.invalidateQueries({ queryKey: ["destination_stats"] });
    },
  });
}

export function useDeleteDestination() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("destinations")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["destinations"] });
      queryClient.invalidateQueries({ queryKey: ["destination_stats"] });
    },
  });
}

export function useToggleDestination() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from("destinations")
        .update({ is_active: isActive })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["destinations"] });
      queryClient.invalidateQueries({ queryKey: ["destination_stats"] });
    },
  });
}