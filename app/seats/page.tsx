import React from 'react'
import { SeatsList } from './components/SeatsList'
import { createClient } from "@/utils/supabase/server";
import { DatabaseTable } from '@/utils/supabase/client';
import { Seat, Manager } from '@/entities';

const Seats = async () => {
  const supabaseClient = createClient();
  const { data: seats } = await supabaseClient.from(DatabaseTable.Seats).select().returns<Seat[]>();
  const { data: managers } = await supabaseClient
  .from(DatabaseTable.Managers)
  .select()
  .returns<Manager[]>();
  return (
    <SeatsList seats={seats || []} managers={managers || []} />
  )
}

export default Seats