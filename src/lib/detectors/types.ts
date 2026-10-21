export type Detector = 'email' | 'uk_phone' | 'uk_nino' | 'payment_card';

export type Risk = 'None' | 'Low' | 'Medium' | 'High' | 'Critical';

export type Finding = {
  detector: Detector;
  risk: Risk;
  occurrences: number;
  maskedExample: string;
};

export type ScanResult = {
  risk: Risk;
  findings: Finding[];
};

/** A detector hit. Holds the span and the masked value only — never the raw text. */
export type DetectorMatch = {
  start: number;
  end: number;
  masked: string;
};
