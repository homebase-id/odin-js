export type ThemeDefinition = {
    id: number,
    title: string,
    description: string,
    previewUrl: string
}

export function getThemes(): ThemeDefinition[] {
    const themes: ThemeDefinition[] = [
        CoverPageThemeDescription,
        SocialClassicThemeDescription
    ]

    return themes;
}

export const CoverPageThemeDescription: ThemeDefinition = {id: 111, title: "Cover page", description: "Simplified cover page with minimal info", previewUrl: ""};
export const SocialClassicThemeDescription: ThemeDefinition = {id: 222, title: "Social Classic", description: "Matches the well known social network layout", previewUrl: ""};
