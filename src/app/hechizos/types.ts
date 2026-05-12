export interface SpellRaw {
  name: string;
  source: string;
  page: number;
  level: number;
  school: string;

  time: Array<{ number: number; unit: string }>;

  range: {
    type: string;
    distance: {
      type: string;
      amount?: number;
    };
  };

  components: {
    v?: boolean;
    s?: boolean;
    m?: { text?: string };
  };

  duration: Array<{
    type: string;
    duration?: { type: string; amount?: number };
  }>;

  entries: string[];

  entriesHigherLevel?: Array<{
    entries: string[];
  }>;
 scalingLevelDice?: any;
}

export interface Spell {
  name_en: string;
  name_es?: string;

  level: number;
  school: string;

  casting_time: string;
  range: string;
  components: string;
  duration: string;

  description: string;
  higher_level?: string;

  source_file: string;

  
  _search?: string;
}