// Type boundary for the search module reused from Achmage Markdown Renderer.
export type DocType = string;
export type OutputMode = string;
export type SourceDocument = {
  meta: {
    slug?: string;
    title: string;
    docType: DocType;
    date?: string;
    outputs: OutputMode[];
    summary?: string;
    tags: string[];
  };
  rawFrontmatter: Record<string, unknown>;
  body: string;
};
