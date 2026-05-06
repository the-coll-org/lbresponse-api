export interface ProviderContact {
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
}

export interface ProviderService {
  name?: string | null;
  sector?: string | null;
  district?: string | null;
  target_age_gender?: string | null;
  target_population?: string | null;
  accessible?: boolean | null;
}

export interface Provider {
  provider_id: string;
  provider_name: string;
  provider_name_ar?: string | null;
  slug?: string | null;
  primary_contact?: ProviderContact | null;
  secondary_contact?: ProviderContact | null;
  sectors?: string[] | null;
  districts?: string[] | null;
  services?: ProviderService[] | null;
  service_count?: number | null;
  is_name_valid?: boolean | null;
  pinned?: boolean | null;
  verified?: boolean | null;
  updated_at?: string | null;
}

export interface Location {
  location_id: string;
  governorate?: string | null;
  city?: string | null;
  city_ar?: string | null;
  district?: string | null;
  district_ar?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

export interface CategoryRecord {
  key: string;
  en_label: string;
  ar_label?: string | null;
  sort_order?: number | null;
}

export interface OrganizationDto {
  id: string;
  title: string;
  title_ar: string | null;
  description: string | null;
  description_ar: string | null;
  email: string | null;
  verified: boolean;
  phone_numbers: string[];
  whatsapp: string | null;
  social_media: string[];
  type: string | null;
  locations: string[];
  sectors: string[];
  services: ProviderService[];
  service_count: number;
  primary_contact_name: string | null;
  secondary_contact: ProviderContact | null;
  map_url: string | null;
  organization_type: string | null;
  updated_at: string | null;
}

export interface FilterOption {
  id: string;
  label: string;
  label_ar: string | null;
  result_count: number;
  display_order: number;
}

export interface FilterGroup {
  group_id: string;
  group_label: string;
  group_label_ar: string;
  options: FilterOption[];
}
