import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";

export type WhatsAppGroup = Tables<"whatsapp_groups">;
export type WhatsAppGroupInsert = TablesInsert<"whatsapp_groups">;

export function useGroups() {
  return useQuery({
    queryKey: ["whatsapp_groups"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("whatsapp_groups")
        .select("*")
        .order("group_name");
      if (error) throw error;
      return data as WhatsAppGroup[];
    },
  });
}

export function useGroupStats() {
  return useQuery({
    queryKey: ["group_stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("whatsapp_groups")
        .select("is_active");
      
      if (error) throw error;
      
      const active = data?.filter(g => g.is_active).length || 0;
      const inactive = data?.filter(g => !g.is_active).length || 0;
      
      return { active, inactive, total: data?.length || 0 };
    },
  });
}

export function useCreateGroup() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (group: WhatsAppGroupInsert) => {
      const { data, error } = await supabase
        .from("whatsapp_groups")
        .insert(group)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp_groups"] });
      queryClient.invalidateQueries({ queryKey: ["group_stats"] });
    },
  });
}

export function useUpdateGroup() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<WhatsAppGroup> & { id: string }) => {
      const { data, error } = await supabase
        .from("whatsapp_groups")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp_groups"] });
      queryClient.invalidateQueries({ queryKey: ["group_stats"] });
    },
  });
}

export function useDeleteGroup() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("whatsapp_groups")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp_groups"] });
      queryClient.invalidateQueries({ queryKey: ["group_stats"] });
    },
  });
}

export function useToggleGroup() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from("whatsapp_groups")
        .update({ is_active: isActive })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp_groups"] });
      queryClient.invalidateQueries({ queryKey: ["group_stats"] });
    },
  });
}