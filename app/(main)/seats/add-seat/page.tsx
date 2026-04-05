import type { Metadata } from "next";
import React from "react";
import { SeatFormBuilder } from "../components/AddSeat";

export const metadata: Metadata = {
  title: "Add Seat",
};

const AddSeatPage = () => {
  return (
    <SeatFormBuilder />
  );
};

export default AddSeatPage;
