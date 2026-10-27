# Codebase Map & Symbol Catalog 🗺️

> **AUTO-GENERATED & VERIFIED BY `scripts/update_knowledge_base.py`**
> This document provides an automated, up-to-date registry of all modules, classes, and exported functions across this repository.

---

## 📊 Codebase Metrics
- **Total Python Modules**: `1`
- **Total Classes**: `1`
- **Total Top-Level Functions**: `4`
- **Total Class Methods**: `78`
- **Total Source Lines**: `1124`

---

## 📦 Modules & Exported Symbols

### [`tests/test_profile.py`](tests/test_profile.py)
> *Regression tests for the AegeanWorks profile, site and licensing integrity.*

**Size**: `1124` lines (`51680` bytes)

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
  - Method `.test_project_dossier_page_is_wired()`
  - Method `.test_site_is_self_contained()`
  - Method `.test_node_suites_are_esm()`
  - Method `.test_verifier_conveniences_are_wired()`
  - Method `.test_service_worker_shell_is_complete()`
  - Method `.test_trust_pages_are_published_and_linked()`
  - Method `.test_security_txt_is_valid()`
  - Method `.test_atlas_search_topic_sort_and_url_state()`
  - Method `.test_live_atlas_is_wired_to_the_github_api()`
  - Method `.test_site_lists_every_public_repository_once()`
  - Method `.test_site_filter_chips_match_categories()`
  - Method `.test_project_cards_carry_an_immutable_repository_id()`
  - Method `.test_project_cards_show_language_license_and_recency()`
  - Method `.test_featured_work_cards_carry_an_immutable_repository_id()`
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
  - Method `.test_verify_page_has_a_no_javascript_path()`
  - Method `.test_verifier_caps_fetches_before_reading()`
  - Method `.test_verifier_checks_types_before_canonicalization()`
  - Method `.test_verifier_canonical_numbers_and_del_are_bounded()`
  - Method `.test_verifier_explains_a_disabled_browser_crypto_path()`
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
  - Method `.test_ci_workflow_runs_the_node_parity_suite()`
  - Method `.test_snapshot_covers_every_public_repository()`
  - Method `.test_site_metadata_matches_the_github_profile()`
  - Method `.test_project_cards_match_github_metadata()`
  - Method `.test_readme_atlas_matches_github_metadata()`
  - Method `.test_verify_page_is_linked_and_complete()`
  - Method `.test_verify_page_is_self_contained()`
  - Method `.test_verifier_reads_only_the_canonical_registry()`
  - Method `.test_verifier_cannot_check_signatures()`
  - Method `.test_verifier_never_uploads_the_certificate()`
  - Method `.test_verifier_form_cannot_natively_submit()`
  - Method `.test_verifier_uses_text_nodes_only()`
  - Method `.test_site_ships_no_signing_material()`
  - Method `.test_verification_vector_is_pinned()`
  - Method `.test_sitemap_lists_the_verify_page()`
  - Method `.test_external_links_are_safe_on_every_page()`
  - Method `.test_pages_send_a_content_security_policy()`

**Functions:**
- `def read_readme()`
- `def read_site()`
- `def read_verify()`
- `def read_metadata()`

---
