# Stage 05 Import Order

Import files in this order to avoid missing relationship dependencies.

## 1. Core biological and chemical entities

1. plant_taxon.csv
2. compound.csv

## 2. Core relationships

3. plant_compound.csv

## 3. Compound annotation layers

4. compound_np_classification.csv
5. compound_chembl_activity.csv
6. compound_kegg_link.csv
7. compound_target_interactions.csv
8. compound_toxicity.csv
9. compound_structure_files.csv
10. compound_nmr.csv

## 4. Omics and signature layers

11. lincs_compound_map.csv
12. lincs_signature_long.csv
13. geo_genus_mentions.csv
14. geo_molecule_mentions.csv

## 5. Narrative/contextual knowledge

15. plant_attribute_evidence.csv
16. genus_attribute_evidence.csv
17. metabolite_family_reference_knowledge.csv
18. metabolite_family_reference_link.csv
19. plant_attribute_reference_link.csv

## 6. Derived semantic mapping

20. compound_metabolite_family_link.csv

## 7. Publications and references

21. reference.csv
22. publication.csv

## 8. Collaboration and Review Center

23. collaboration_submissions.csv
24. submission_files.csv
25. submission_parsed_rows.csv
26. submission_validation_reports.csv
27. submission_structured_rows.csv

## 9. Final views

After importing all CSV files, rerun the view section in schema.sql.

This creates:

- v_plant_genus_context
- v_compound_metabolite_context
- v_graph_plant_compound_edges
- v_graph_compound_target_edges
- v_data_access_plants
- v_data_access_compounds
- v_data_access_targets