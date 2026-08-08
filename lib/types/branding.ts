export interface AgencyBranding {
  agencyName: string;
  clientName?: string;
  logoUrl?: string;
  primaryColor?: string; // Hex e.g. #4F46E5
  contactEmail?: string;
  websiteUrl?: string;
  hidePlatformBranding?: boolean;
}

export const DEFAULT_BRANDING: AgencyBranding = {
  agencyName: "SEO Audit Platform",
  primaryColor: "#4F46E5",
  hidePlatformBranding: false,
};
