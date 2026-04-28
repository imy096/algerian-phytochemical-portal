from etl.base_loader import BaseLoader
import logging

logger = logging.getLogger(__name__)


class GeoLincsLoader(BaseLoader):
    def load_geo_molecule_mentions(self):
        logger.info("GEO molecule mentions are enrichment-only and are not loaded into canonical tables yet")

    def load_lincs_experiments(self):
        logger.info("Loading LINCS experiments")
        df = self.load_csv("stage5_database_ready/lincs_experiments.csv")

        if df.empty:
            logger.warning("No LINCS experiment data found")
            return

        compounds = self.db.table("compound").select("compound_id, pubchem_cid").execute()
        cid_map = {str(c["pubchem_cid"]): c["compound_id"] for c in compounds.data if c.get("pubchem_cid")}

        signatures = []
        for _, row in df.iterrows():
            cid = self.first_non_empty(row, "pubchem_cid")
            experiment_id = self.first_non_empty(row, "experiment_id")
            if cid and experiment_id and cid in cid_map:
                signatures.append(self.clean_record({
                    "level": "compound",
                    "compound_id": cid_map[cid],
                    "source": "LINCS",
                    "experiment_id": experiment_id,
                    "metadata": {
                        "cell_line": self.first_non_empty(row, "cell_line"),
                        "dose": self.first_non_empty(row, "dose"),
                        "time_point": self.first_non_empty(row, "time_point"),
                    },
                }))

        self.upsert_batch("signature", signatures, on_conflict="source,experiment_id")
        logger.info(f"Loaded or updated {len(signatures)} LINCS signatures")

    def load_genes(self):
        logger.info("Loading genes from LINCS data")
        df = self.load_csv("stage5_database_ready/lincs_gene_expression.csv")

        if df.empty:
            logger.warning("No gene data found")
            return

        unique_genes = df[[c for c in ["gene_symbol", "entrez_id"] if c in df.columns]].drop_duplicates()
        genes = []
        for _, row in unique_genes.iterrows():
            symbol = self.first_non_empty(row, "gene_symbol")
            entrez_id = self.first_non_empty(row, "entrez_id")
            if not (symbol or entrez_id):
                continue
            genes.append(self.clean_record({
                "symbol": symbol,
                "entrez_id": entrez_id,
                "organism": "Homo sapiens",
            }))

        self.upsert_batch("gene", genes, on_conflict="entrez_id")
        logger.info(f"Loaded or updated {len(genes)} genes")

    def load_lincs_gene_expression(self):
        logger.info("Loading LINCS gene expression")
        df = self.load_csv("stage5_database_ready/lincs_gene_expression.csv")

        if df.empty:
            logger.warning("No LINCS gene expression data found")
            return

        genes = self.db.table("gene").select("gene_id, symbol, entrez_id").execute()
        gene_map = {}
        for g in genes.data:
            if g.get("symbol"):
                gene_map[str(g["symbol"]).strip()] = g["gene_id"]
            if g.get("entrez_id"):
                gene_map[str(g["entrez_id"]).strip()] = g["gene_id"]

        signatures = self.db.table("signature").select("signature_id, experiment_id, source").eq("source", "LINCS").execute()
        sig_map = {str(s["experiment_id"]).strip(): s["signature_id"] for s in signatures.data if s.get("experiment_id")}

        signature_genes = []
        for _, row in df.iterrows():
            experiment_id = self.first_non_empty(row, "experiment_id")
            gene_key = self.first_non_empty(row, "gene_symbol", "entrez_id")

            if experiment_id in sig_map and gene_key in gene_map:
                log_fc = self.parse_float(row.get("log_fc"))
                if log_fc is None:
                    continue
                direction = "up" if log_fc > 0 else "down" if log_fc < 0 else "neutral"
                signature_genes.append(self.clean_record({
                    "signature_id": sig_map[experiment_id],
                    "gene_id": gene_map[gene_key],
                    "log_fc": log_fc,
                    "p_value": self.parse_float(row.get("p_value")),
                    "adj_p_value": self.parse_float(row.get("adj_p_value")),
                    "direction": direction,
                }))

        self.upsert_batch("signature_gene", signature_genes, on_conflict="signature_id,gene_id")
        logger.info(f"Loaded or updated {len(signature_genes)} signature-gene associations")


def run(supabase_client, data_dir):
    loader = GeoLincsLoader(supabase_client, data_dir)
    loader.load_genes()
    loader.load_lincs_experiments()
    loader.load_lincs_gene_expression()
    loader.load_geo_molecule_mentions()
