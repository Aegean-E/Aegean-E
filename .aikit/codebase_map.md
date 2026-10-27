# Codebase Map & Symbol Catalog 🗺️

> **AUTO-GENERATED & VERIFIED BY `scripts/update_knowledge_base.py`**
> This document provides an automated, up-to-date registry of all modules, classes, and exported functions across this repository.

---

## 📊 Codebase Metrics
- **Total Python Modules**: `1`
- **Total Classes**: `1`
- **Total Top-Level Functions**: `2`
- **Total Class Methods**: `45`
- **Total Source Lines**: `517`

---

## 📦 Modules & Exported Symbols

### [`tests/test_profile.py`](tests/test_profile.py)
> *Regression tests for the AegeanWorks profile, site and licensing integrity.*

**Size**: `517` lines (`21715` bytes)

**Classes:**
- `class ProfileIntegrityTests` - *Guard the profile structure, links, voice and configuration.*
  - Method `.test_readme_exists_and_non_empty()`
  - Method `.test_readme_sections_present()`
  - Method `.test_readme_categories_are_title_cased()`
  - Method `.test_readme_speaks_as_the_company()`
  - Method `.test_banner_asset_present()`
  - Method `.test_funding_configuration()`
  - Method `.test_only_public_repositories_are_linked()`
  - Method `.test_readme_atlas_lists_every_public_repository()`
  - Method `.test_license_matches_the_aikit_family()`
  - Method `.test_site_entry_points_exist()`
  - Method `.test_site_is_self_contained()`
  - Method `.test_site_lists_every_public_repository_once()`
  - Method `.test_site_filter_counts_match_cards()`
  - Method `.test_site_licensing_copy_is_current()`
  - Method `.test_licensing_copy_names_the_agpl_transition()`
  - Method `.test_project_count_names_project_repositories()`
  - Method `.test_site_license_tiers_link_to_canonical_texts()`
  - Method `.test_external_links_are_safe()`
  - Method `.test_site_accessibility_basics()`
  - Method `.test_site_works_without_javascript()`
  - Method `.test_site_degrades_open_when_the_script_fails()`
  - Method `.test_hero_chip_is_exposed_to_assistive_tech()`
  - Method `.test_social_metadata_is_complete()`
  - Method `.test_structured_data_describes_the_organization()`
  - Method `.test_filter_chips_control_the_project_grid()`
  - Method `.test_anchor_navigation_clears_the_sticky_header()`
  - Method `.test_discovery_files()`
  - Method `.test_social_image_has_the_expected_dimensions()`
  - Method `.test_not_found_page_is_noindexed()`
  - Method `.test_web_app_manifest()`
  - Method `.test_icon_dimensions()`
  - Method `.test_mobile_orbit_labels_are_large_enough()`
  - Method `.test_print_media_reveals_every_section()`
  - Method `.test_mobile_menu_is_opaque_and_single_github_entry()`
  - Method `.test_mobile_scrim_absorbs_taps()`
  - Method `.test_open_menu_makes_the_page_behind_inert()`
  - Method `.test_open_menu_contains_keyboard_focus()`
  - Method `.test_header_links_close_the_open_menu()`
  - Method `.test_license_identifiers_do_not_break_at_hyphens()`
  - Method `.test_site_recovers_when_app_js_fails()`
  - Method `.test_noscript_nav_is_inside_the_sticky_header()`
  - Method `.test_orbit_animation_is_centred()`
  - Method `.test_hero_mark_is_centred_in_its_square()`
  - Method `.test_aikit_memory_intact()`
  - Method `.test_ci_workflow_runs_the_suite()`

**Functions:**
- `def read_readme()`
- `def read_site()`

---
