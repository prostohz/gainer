type TPriceLevelItem = {
  price: number;
  strength: number;
};

export type TPriceLevels = {
  supportLevels: TPriceLevelItem[];
  resistanceLevels: TPriceLevelItem[];
};
