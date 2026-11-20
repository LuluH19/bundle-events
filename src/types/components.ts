import type { ReactNode } from "react";
import type { Location, RouteResult, HotelMapItem } from "./index";

export type IconProps = { size?: number; className?: string };

export interface TravelMapProps {
  departure: Location | null;
  venue: Location | null;
  hotel: Location | null;
  route: RouteResult | null;
  hotelResults: HotelMapItem[];
  selectedHotelId: string | null;
  onHotelSelect: (hotel: HotelMapItem) => void;
  hotelRadius: number;
  showHotels: boolean;
  fitPadding?: number;
}

export interface EyebrowProps {
  children: ReactNode;
  className?: string;
  tone?: "ember" | "navy" | "muted";
}

export interface ChipProps {
  children: ReactNode;
  className?: string;
}

export interface ButtonProps {
  children: ReactNode;
  onClick?: () => void;
  kind?: "primary" | "dark" | "ghost";
  className?: string;
  disabled?: boolean;
  type?: "button" | "submit";
}
