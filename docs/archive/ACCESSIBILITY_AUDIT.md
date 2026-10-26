# Accessibility Contrast Audit

This audit reviews TERRACE's established foreground, utility-text, primary-action, and focus-indicator colors against the solid backgrounds used in the storefront. Contrast ratios are calculated with the WCAG relative-luminance method and evaluated against the **4.5:1 AA threshold for normal text**.

| Reviewed pair | Ratio | Result | Application |
| --- | ---: | --- | --- |
| Ink `#15171A` on Fog `#EFF1EE` | 15.81:1 | Pass | Primary display and interface text |
| Pitch `#3E4F3B` on Fog `#EFF1EE` | 7.75:1 | Pass | Eyebrows, actions, and focus outline |
| Utility text `#555751` on Fog `#EFF1EE` | 6.45:1 | Pass | Product metadata and supporting copy |
| Utility text `#555751` on Paper `#FFFFFF` | 7.32:1 | Pass | Supporting copy on white sections |
| Footer legal `#BEC1BC` on Ink `#15171A` | 9.87:1 | Pass | Footer metadata |
| Paper `#FFFFFF` on Pitch `#3E4F3B` | 8.80:1 | Pass | White action text and dark-section focus outline |
| Paper `#FFFFFF` on Ink `#15171A` | 17.96:1 | Pass | Announcement and footer text/focus outline |
| Pitch focus outline on Paper `#FFFFFF` | 8.80:1 | Pass | Links, buttons, inputs, and selects |
| Paper focus outline on Ink/Pitch | 17.96:1 / 8.80:1 | Pass | Hero, campaign, and footer links |

The stylesheet applies a visible two-pixel focus outline with a three-pixel offset. Standard controls use **Pitch** on Fog and Paper; hero, campaign, and footer links use **Paper** on their dark sections. Photographic hero areas retain the Paper outline alongside their dark visual overlay.
