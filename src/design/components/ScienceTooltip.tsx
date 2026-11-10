import React from 'react';
import { ScienceTerm } from '../../components/ScienceTerm';
import { Language } from '../../utils/translations';

export interface ScienceTooltipProps {
  termKey: string;
  language?: Language;
  showSimpleLabel?: boolean;
  children?: React.ReactNode;
  className?: string;
}

export const ScienceTooltip: React.FC<ScienceTooltipProps> = ({
  termKey,
  language = 'en',
  showSimpleLabel = true,
  children,
  className,
}) => {
  return (
    <ScienceTerm
      termKey={termKey}
      language={language}
      showSimpleLabel={showSimpleLabel}
      overrideLabel={children}
      className={className}
    />
  );
};
