import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import App from "./App";

test("renders the Scheduler navbar and home page", () => {
  render(
    <BrowserRouter>
      <App />
    </BrowserRouter>
  );
  const navLinks = screen.getAllByText(/Scheduler/i);
  expect(navLinks.length).toBeGreaterThan(0);
  expect(screen.getByText(/Coordinate/i)).toBeInTheDocument();
  expect(screen.getByText(/Join as Attendee/i)).toBeInTheDocument();
});
