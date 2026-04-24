import logo from "@/assets/aserp-logo.jpeg";
import { cn } from "@/lib/utils";

type Props = { className?: string; alt?: string };

export const Logo = ({ className, alt = "ASERP" }: Props) => (
  <img
    src={logo}
    alt={alt}
    className={cn("h-9 w-9 rounded-md object-contain bg-white", className)}
  />
);

export default Logo;
