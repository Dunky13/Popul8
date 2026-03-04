import InlineSVG from "react-inlinesvg";
import { materialIcons, type MaterialIconName } from "../../assets/icons/material";

interface IconProps {
  name: MaterialIconName;
  size?: number;
  className?: string;
  ariaLabel?: string;
}

const Icon = ({ name, size = 24, className, ariaLabel }: IconProps) => {
  const isDecorative = !ariaLabel;
  return (
    <InlineSVG
      src={materialIcons[name]}
      width={size}
      height={size}
      className={className}
      aria-hidden={isDecorative}
      aria-label={ariaLabel}
      style={{ width: size, height: size }}
    />
  );
};

export default Icon;
