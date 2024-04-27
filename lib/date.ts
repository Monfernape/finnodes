/**
 * @param dateString string
 * @description This function takes a date string and returns a formatted date string.
 * @example formatDate("2021-09-01T00:00:00.000Z") => "01/09/2021 at 12:00:00 AM"
 * @returns 
 */
export const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  const day = ("0" + date.getDate()).slice(-2);
  const month = ("0" + (date.getMonth() + 1)).slice(-2);
  const year = date.getFullYear();
  let hours = date.getHours();
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  hours = hours ? hours : 12;
  const minutes = ("0" + date.getMinutes()).slice(-2);
  const seconds = ("0" + date.getSeconds()).slice(-2);
  return `${day}/${month}/${year} at ${hours}:${minutes}:${seconds} ${ampm}`;
};
