from neo4j import GraphDatabase
import logging
from typing import List, Dict, Any

logger = logging.getLogger(__name__)

class Neo4jGraphBuilder:
    def __init__(self, uri: str, user: str, password: str):
        self.driver = GraphDatabase.driver(uri, auth=(user, password))

    def close(self):
        self.driver.close()

    def clear_graph(self):
        with self.driver.session() as session:
            session.run("MATCH (n) DETACH DELETE n")
        logger.info("Graph cleared")

    def create_constraints(self):
        with self.driver.session() as session:
            constraints = [
                "CREATE CONSTRAINT IF NOT EXISTS FOR (p:Plant) REQUIRE p.id IS UNIQUE",
                "CREATE CONSTRAINT IF NOT EXISTS FOR (c:Compound) REQUIRE c.id IS UNIQUE",
                "CREATE CONSTRAINT IF NOT EXISTS FOR (g:Gene) REQUIRE g.id IS UNIQUE",
                "CREATE CONSTRAINT IF NOT EXISTS FOR (p:Pathway) REQUIRE p.id IS UNIQUE",
                "CREATE CONSTRAINT IF NOT EXISTS FOR (d:Disease) REQUIRE d.id IS UNIQUE",
                "CREATE CONSTRAINT IF NOT EXISTS FOR (s:Signature) REQUIRE s.id IS UNIQUE",
            ]

            for constraint in constraints:
                session.run(constraint)

        logger.info("Constraints created")

    def create_plant_nodes(self, plants: List[Dict[str, Any]]):
        with self.driver.session() as session:
            query = """
            UNWIND $plants AS plant
            MERGE (p:Plant {id: plant.id})
            SET p.scientific_name = plant.scientific_name,
                p.genus = plant.genus,
                p.family = plant.family,
                p.endemic = plant.endemic_flag
            """
            session.run(query, plants=plants)
        logger.info(f"Created {len(plants)} plant nodes")

    def create_compound_nodes(self, compounds: List[Dict[str, Any]]):
        with self.driver.session() as session:
            query = """
            UNWIND $compounds AS compound
            MERGE (c:Compound {id: compound.id})
            SET c.name = compound.common_name,
                c.pubchem_cid = compound.pubchem_cid,
                c.smiles = compound.smiles,
                c.molecular_weight = compound.molecular_weight,
                c.chemical_class = compound.chemical_class
            """
            session.run(query, compounds=compounds)
        logger.info(f"Created {len(compounds)} compound nodes")

    def create_gene_nodes(self, genes: List[Dict[str, Any]]):
        with self.driver.session() as session:
            query = """
            UNWIND $genes AS gene
            MERGE (g:Gene {id: gene.id})
            SET g.symbol = gene.symbol,
                g.entrez_id = gene.entrez_id,
                g.description = gene.description
            """
            session.run(query, genes=genes)
        logger.info(f"Created {len(genes)} gene nodes")

    def create_pathway_nodes(self, pathways: List[Dict[str, Any]]):
        with self.driver.session() as session:
            query = """
            UNWIND $pathways AS pathway
            MERGE (p:Pathway {id: pathway.id})
            SET p.name = pathway.name,
                p.source_db = pathway.source_db,
                p.description = pathway.description
            """
            session.run(query, pathways=pathways)
        logger.info(f"Created {len(pathways)} pathway nodes")

    def create_disease_nodes(self, diseases: List[Dict[str, Any]]):
        with self.driver.session() as session:
            query = """
            UNWIND $diseases AS disease
            MERGE (d:Disease {id: disease.id})
            SET d.name = disease.name,
                d.mesh_id = disease.mesh_id,
                d.description = disease.description
            """
            session.run(query, diseases=diseases)
        logger.info(f"Created {len(diseases)} disease nodes")

    def create_signature_nodes(self, signatures: List[Dict[str, Any]]):
        with self.driver.session() as session:
            query = """
            UNWIND $signatures AS signature
            MERGE (s:Signature {id: signature.id})
            SET s.source = signature.source,
                s.experiment_id = signature.experiment_id
            """
            session.run(query, signatures=signatures)
        logger.info(f"Created {len(signatures)} signature nodes")

    def create_plant_compound_relationships(self, links: List[Dict[str, Any]]):
        with self.driver.session() as session:
            query = """
            UNWIND $links AS link
            MATCH (p:Plant {id: link.plant_id})
            MATCH (c:Compound {id: link.compound_id})
            MERGE (p)-[r:CONTAINS_COMPOUND]->(c)
            SET r.plant_part = link.plant_part,
                r.evidence_type = link.evidence_type,
                r.abundance = link.abundance
            """
            session.run(query, links=links)
        logger.info(f"Created {len(links)} plant-compound relationships")

    def create_compound_gene_relationships(self, links: List[Dict[str, Any]]):
        with self.driver.session() as session:
            query = """
            UNWIND $links AS link
            MATCH (c:Compound {id: link.compound_id})
            MATCH (g:Gene {id: link.gene_id})
            MERGE (c)-[r:AFFECTS_GENE]->(g)
            SET r.log_fc = link.log_fc,
                r.direction = link.direction,
                r.p_value = link.p_value
            """
            session.run(query, links=links)
        logger.info(f"Created {len(links)} compound-gene relationships")

    def create_gene_pathway_relationships(self, links: List[Dict[str, Any]]):
        with self.driver.session() as session:
            query = """
            UNWIND $links AS link
            MATCH (g:Gene {id: link.gene_id})
            MATCH (p:Pathway {id: link.pathway_id})
            MERGE (g)-[r:PART_OF_PATHWAY]->(p)
            """
            session.run(query, links=links)
        logger.info(f"Created {len(links)} gene-pathway relationships")

    def create_compound_disease_relationships(self, links: List[Dict[str, Any]]):
        with self.driver.session() as session:
            query = """
            UNWIND $links AS link
            MATCH (c:Compound {id: link.compound_id})
            MATCH (d:Disease {id: link.disease_id})
            MERGE (c)-[r:ASSOCIATED_WITH_DISEASE]->(d)
            SET r.relationship_type = link.relationship_type,
                r.evidence_level = link.evidence_level
            """
            session.run(query, links=links)
        logger.info(f"Created {len(links)} compound-disease relationships")

    def query_plant_to_pathways(self, plant_id: str):
        with self.driver.session() as session:
            query = """
            MATCH (p:Plant {id: $plant_id})-[:CONTAINS_COMPOUND]->(c:Compound)
                  -[:AFFECTS_GENE]->(g:Gene)-[:PART_OF_PATHWAY]->(pw:Pathway)
            RETURN DISTINCT pw.name AS pathway, pw.id AS pathway_id, count(DISTINCT g) AS gene_count
            ORDER BY gene_count DESC
            """
            result = session.run(query, plant_id=plant_id)
            return [dict(record) for record in result]

    def query_disease_to_plants(self, disease_id: str):
        with self.driver.session() as session:
            query = """
            MATCH (d:Disease {id: $disease_id})<-[:ASSOCIATED_WITH_DISEASE]-(c:Compound)
                  <-[:CONTAINS_COMPOUND]-(p:Plant)
            RETURN DISTINCT p.scientific_name AS plant, p.id AS plant_id, count(DISTINCT c) AS compound_count
            ORDER BY compound_count DESC
            """
            result = session.run(query, disease_id=disease_id)
            return [dict(record) for record in result]

    def query_similar_plants(self, plant_id: str, limit: int = 10):
        with self.driver.session() as session:
            query = """
            MATCH (p1:Plant {id: $plant_id})-[:CONTAINS_COMPOUND]->(c:Compound)
                  <-[:CONTAINS_COMPOUND]-(p2:Plant)
            WHERE p1 <> p2
            WITH p2, count(DISTINCT c) AS shared_compounds
            RETURN p2.scientific_name AS plant, p2.id AS plant_id, shared_compounds
            ORDER BY shared_compounds DESC
            LIMIT $limit
            """
            result = session.run(query, plant_id=plant_id, limit=limit)
            return [dict(record) for record in result]
