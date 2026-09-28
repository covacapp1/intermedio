export interface BannerItem {
  img: string;
  href: string;
}

export interface BannersConfig {
  left?: BannerItem | null;
  right?: BannerItem | null;
  mobile?: BannerItem | null;
}
