import { createClient } from "@/utils/supabase/server";
import { resolvePeopleAccess } from "@/utils/auth/people-access";

export const getServerPeopleAccess = async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return resolvePeopleAccess(supabase, user);
};
