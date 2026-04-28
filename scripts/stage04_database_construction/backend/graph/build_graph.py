import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from dotenv import load_dotenv
from database import get_supabase_client
from config import get_settings
from graph.neo4j_builder import Neo4jGraphBuilder
import logging

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def build_knowledge_graph():
    logger.info("Building knowledge graph from Supabase data")

    settings = get_settings()
    db = get_supabase_client()

    graph_builder = Neo4jGraphBuilder(
        uri=settings.neo4j_uri,
        user=settings.neo4j_user,
        password=settings.neo4j_password
    )

    try:
        logger.info("Creating constraints")
        graph_builder.create_constraints()

        logger.info("Loading plants")
        plants = db.table("plant_taxon").select(
            "plant_taxon_id, scientific_name, genus, family, endemic_flag"
        ).execute()
        plant_nodes = [
            {
                "id": p["plant_taxon_id"],
                "scientific_name": p["scientific_name"],
                "genus": p.get("genus"),
                "family": p.get("family"),
                "endemic_flag": p.get("endemic_flag", False)
            }
            for p in plants.data
        ]
        graph_builder.create_plant_nodes(plant_nodes)

        logger.info("Loading compounds")
        compounds = db.table("compound").select(
            "compound_id, common_name, pubchem_cid, smiles, molecular_weight, chemical_class"
        ).limit(10000).execute()
        compound_nodes = [
            {
                "id": c["compound_id"],
                "common_name": c.get("common_name"),
                "pubchem_cid": c.get("pubchem_cid"),
                "smiles": c.get("smiles"),
                "molecular_weight": c.get("molecular_weight"),
                "chemical_class": c.get("chemical_class")
            }
            for c in compounds.data
        ]
        graph_builder.create_compound_nodes(compound_nodes)

        logger.info("Loading genes")
        genes = db.table("gene").select(
            "gene_id, symbol, entrez_id, description"
        ).limit(10000).execute()
        gene_nodes = [
            {
                "id": g["gene_id"],
                "symbol": g["symbol"],
                "entrez_id": g.get("entrez_id"),
                "description": g.get("description")
            }
            for g in genes.data
        ]
        graph_builder.create_gene_nodes(gene_nodes)

        logger.info("Loading pathways")
        pathways = db.table("pathway").select(
            "pathway_id, name, source_db, description"
        ).execute()
        pathway_nodes = [
            {
                "id": p["pathway_id"],
                "name": p["name"],
                "source_db": p.get("source_db"),
                "description": p.get("description")
            }
            for p in pathways.data
        ]
        graph_builder.create_pathway_nodes(pathway_nodes)

        logger.info("Loading diseases")
        diseases = db.table("disease").select(
            "disease_id, name, mesh_id, description"
        ).execute()
        disease_nodes = [
            {
                "id": d["disease_id"],
                "name": d["name"],
                "mesh_id": d.get("mesh_id"),
                "description": d.get("description")
            }
            for d in diseases.data
        ]
        graph_builder.create_disease_nodes(disease_nodes)

        logger.info("Creating plant-compound relationships")
        plant_compounds = db.table("plant_compound").select(
            "plant_taxon_id, compound_id, plant_part, evidence_type, abundance"
        ).limit(10000).execute()
        pc_links = [
            {
                "plant_id": pc["plant_taxon_id"],
                "compound_id": pc["compound_id"],
                "plant_part": pc.get("plant_part"),
                "evidence_type": pc.get("evidence_type"),
                "abundance": pc.get("abundance")
            }
            for pc in plant_compounds.data
        ]
        graph_builder.create_plant_compound_relationships(pc_links)

        logger.info("Creating compound-gene relationships")
        sig_genes = db.table("signature_gene").select(
            "signature_id, gene_id, log_fc, direction, p_value"
        ).limit(50000).execute()

        signatures = db.table("signature").select(
            "signature_id, compound_id"
        ).not_.is_("compound_id", "null").execute()

        sig_compound_map = {s["signature_id"]: s["compound_id"] for s in signatures.data}

        cg_links = []
        for sg in sig_genes.data:
            if sg["signature_id"] in sig_compound_map:
                cg_links.append({
                    "compound_id": sig_compound_map[sg["signature_id"]],
                    "gene_id": sg["gene_id"],
                    "log_fc": sg.get("log_fc"),
                    "direction": sg.get("direction"),
                    "p_value": sg.get("p_value")
                })

        if cg_links:
            graph_builder.create_compound_gene_relationships(cg_links)

        logger.info("Creating gene-pathway relationships")
        gene_pathways = db.table("gene_pathway").select(
            "gene_id, pathway_id"
        ).execute()
        gp_links = [
            {"gene_id": gp["gene_id"], "pathway_id": gp["pathway_id"]}
            for gp in gene_pathways.data
        ]
        if gp_links:
            graph_builder.create_gene_pathway_relationships(gp_links)

        logger.info("Creating compound-disease relationships")
        compound_diseases = db.table("compound_disease").select(
            "compound_id, disease_id, relationship_type, evidence_level"
        ).execute()
        cd_links = [
            {
                "compound_id": cd["compound_id"],
                "disease_id": cd["disease_id"],
                "relationship_type": cd.get("relationship_type"),
                "evidence_level": cd.get("evidence_level")
            }
            for cd in compound_diseases.data
        ]
        if cd_links:
            graph_builder.create_compound_disease_relationships(cd_links)

        logger.info("Knowledge graph built successfully")

    finally:
        graph_builder.close()

if __name__ == "__main__":
    build_knowledge_graph()
