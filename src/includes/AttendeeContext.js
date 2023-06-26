import { createContext, useState } from 'react';

const AttendeeContext = createContext();

export const AttendeeProvider = ({ children }) => {
  const [attendeeDataChanged, setAttendeeDataChanged] = useState(false);

  return (
    <AttendeeContext.Provider value={{ attendeeDataChanged, setAttendeeDataChanged }}>
      {children}
    </AttendeeContext.Provider>
  );
};

export default AttendeeContext;
