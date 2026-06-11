
import {
    Document,
    Packer,
    Paragraph,
    TextRun,
    HeadingLevel,
    AlignmentType,
    UnderlineType,
    convertInchesToTwip,
    ImageRun,
    Table,
    TableRow,
    TableCell,
    ShadingType,
    WidthType,
    TableOfContents,
    BorderStyle,
} from 'docx';
import { marked } from 'marked';
import axios from 'axios';
import { stripInlineH8TagsForExport } from './inlineEntityParserService';

export type CoverTemplateId = 'minimal' | 'corporate' | 'bold';

export type GenerateDocxOptions = {
    /** Half-points (e.g. 22 = 11pt, 24 = 12pt) */
    bodyFontHalfPt?: number;
    fontFamily?: string;
    coverTemplate?: CoverTemplateId;
    /** RRGGBB without leading # */
    primaryColorHex?: string;
    secondaryColorHex?: string;
    logoDataUrl?: string;
    includeTableOfContents?: boolean;
};

export class DocxService {
    private static normalizeWordColorHex(input?: string, fallback = '2563EB'): string {
        if (!input || typeof input !== 'string') return fallback;
        const s = input.trim().replace(/^#/, '');
        if (!/^[0-9A-Fa-f]{6}$/.test(s)) return fallback;
        return s.toUpperCase();
    }

    private static decodeDataUrlImage(
        dataUrl: string
    ): { data: Buffer; type: 'png' | 'jpeg' | 'gif' } | null {
        const m = dataUrl.match(/^data:(image\/(png|jpeg|jpg|gif));base64,(.+)$/i);
        if (!m) return null;
        try {
            const buf = Buffer.from(m[3], 'base64');
            if (buf.length > 2_500_000) return null;
            const t = m[2].toLowerCase();
            const type = (t === 'jpg' ? 'jpeg' : t) as 'png' | 'jpeg' | 'gif';
            return { data: buf, type };
        } catch {
            return null;
        }
    }

    private static pageBreakParagraph(): Paragraph {
        return new Paragraph({
            pageBreakBefore: true,
            children: [],
        });
    }

    private static async tryLogoParagraph(
        logoDataUrl: string | undefined,
        alignment: (typeof AlignmentType)[keyof typeof AlignmentType]
    ): Promise<Paragraph | null> {
        if (!logoDataUrl) return null;
        const decoded = this.decodeDataUrlImage(logoDataUrl);
        if (!decoded) return null;
        return new Paragraph({
            alignment,
            spacing: { after: 200 },
            children: [
                new ImageRun({
                    data: decoded.data,
                    transformation: { width: 180, height: 180 },
                    type: decoded.type,
                } as any),
            ],
        });
    }

    /**
     * Branded cover blocks (before TOC / body). Does not include trailing page break.
     */
    private static async buildCoverBlocks(args: {
        template: CoverTemplateId;
        title: string;
        organization?: string;
        tagline?: string;
        primary: string;
        secondary: string;
        logoDataUrl?: string;
        metadata?: Record<string, any>;
    }): Promise<(Paragraph | Table)[]> {
        const { template, title, organization, tagline, primary, secondary, logoDataUrl, metadata } = args;
        const headline = (organization && organization.trim()) || title;
        const out: (Paragraph | Table)[] = [];

        if (template === 'minimal') {
            const logo = await this.tryLogoParagraph(logoDataUrl, AlignmentType.CENTER);
            if (logo) out.push(logo);
            out.push(
                new Paragraph({
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 120 },
                    children: [
                        new TextRun({
                            text: headline,
                            bold: true,
                            size: 56,
                            color: primary,
                        }),
                    ],
                })
            );
            if (tagline?.trim()) {
                out.push(
                    new Paragraph({
                        alignment: AlignmentType.CENTER,
                        spacing: { after: 200 },
                        children: [
                            new TextRun({
                                text: tagline.trim(),
                                size: 28,
                                color: secondary,
                                italics: true,
                            }),
                        ],
                    })
                );
            }
            out.push(
                new Paragraph({
                    alignment: AlignmentType.CENTER,
                    border: {
                        bottom: { color: primary, style: BorderStyle.SINGLE, size: 12 },
                    },
                    spacing: { after: 400 },
                    children: [new TextRun({ text: '\u00a0', size: 8 })],
                })
            );
        } else if (template === 'corporate') {
            const logo = await this.tryLogoParagraph(logoDataUrl, AlignmentType.LEFT);
            const rightChildren: Paragraph[] = [];
            if (logo) {
                const logoPara = logo;
                rightChildren.push(logoPara);
            }
            rightChildren.push(
                new Paragraph({
                    spacing: { after: 120 },
                    children: [
                        new TextRun({
                            text: headline,
                            bold: true,
                            size: 52,
                            color: primary,
                        }),
                    ],
                })
            );
            if (tagline?.trim()) {
                rightChildren.push(
                    new Paragraph({
                        spacing: { after: 160 },
                        children: [
                            new TextRun({
                                text: tagline.trim(),
                                size: 24,
                                color: secondary,
                            }),
                        ],
                    })
                );
            }
            if (metadata) {
                const lines: TextRun[] = [];
                for (const [key, value] of Object.entries(metadata)) {
                    lines.push(
                        new TextRun({ text: `${key}: `, bold: true, size: 20, color: secondary }),
                        new TextRun({ text: String(value), size: 20 }),
                        new TextRun({ text: '\n' })
                    );
                }
                if (lines.length) {
                    rightChildren.push(new Paragraph({ children: lines, spacing: { after: 200 } }));
                }
            }

            out.push(
                new Table({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    rows: [
                        new TableRow({
                            children: [
                                new TableCell({
                                    width: { size: 1800, type: WidthType.DXA },
                                    shading: { fill: primary, type: ShadingType.CLEAR },
                                    margins: { top: 200, bottom: 200, left: 200, right: 200 },
                                    children: [new Paragraph({ text: '' })],
                                }),
                                new TableCell({
                                    children: rightChildren,
                                    margins: { top: 200, bottom: 200, left: 360, right: 200 },
                                }),
                            ],
                        }),
                    ],
                })
            );
        } else {
            /* bold */
            const logo = await this.tryLogoParagraph(logoDataUrl, AlignmentType.LEFT);
            if (logo) out.push(logo);
            out.push(
                new Paragraph({
                    spacing: { before: 120, after: 200 },
                    border: {
                        left: { color: primary, style: BorderStyle.THICK, size: 24, space: 8 },
                    },
                    indent: { left: convertInchesToTwip(0.12) },
                    children: [
                        new TextRun({
                            text: headline,
                            bold: true,
                            size: 56,
                            color: primary,
                        }),
                    ],
                })
            );
            if (tagline?.trim()) {
                out.push(
                    new Paragraph({
                        spacing: { after: 240 },
                        indent: { left: convertInchesToTwip(0.12) },
                        children: [
                            new TextRun({
                                text: tagline.trim(),
                                size: 28,
                                color: secondary,
                            }),
                        ],
                    })
                );
            }
        }

        return out;
    }

    /**
     * Generates a DOCX buffer from Markdown content.
     */
    static async generateDocx(
        markdownContent: string,
        title: string,
        metadata?: Record<string, any>,
        options?: GenerateDocxOptions
    ): Promise<Buffer> {
        const normalizedMarkdownContent = this.normalizeMarkdownForDocx(markdownContent);
        const tokens = marked.lexer(normalizedMarkdownContent);

        const bodyHalfPt = options?.bodyFontHalfPt ?? 24;
        const bodyFont = options?.fontFamily || 'Calibri';
        const primary = this.normalizeWordColorHex(options?.primaryColorHex, '2563EB');
        const secondary = this.normalizeWordColorHex(options?.secondaryColorHex, '64748B');
        const coverTemplate = options?.coverTemplate;
        const useCover = coverTemplate === 'minimal' || coverTemplate === 'corporate' || coverTemplate === 'bold';
        const includeToc = options?.includeTableOfContents === true;

        const children: (Paragraph | Table | TableOfContents)[] = [];

        if (useCover) {
            const org = metadata && typeof metadata.Organization === 'string' ? metadata.Organization : undefined;
            const tag = metadata && typeof metadata.Tagline === 'string' ? metadata.Tagline : undefined;
            children.push(
                ...(await this.buildCoverBlocks({
                    template: coverTemplate,
                    title,
                    organization: org,
                    tagline: tag,
                    primary,
                    secondary,
                    logoDataUrl: options?.logoDataUrl,
                    metadata,
                }))
            );
            children.push(this.pageBreakParagraph());
        } else {
            children.push(
                new Paragraph({
                    text: title,
                    heading: HeadingLevel.TITLE,
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 400 },
                })
            );
            if (metadata) {
                const metaLines: TextRun[] = [];
                for (const [key, value] of Object.entries(metadata)) {
                    metaLines.push(
                        new TextRun({ text: `${key}: ${value}`, bold: true, size: 20 }),
                        new TextRun({ text: '\n' })
                    );
                }
                if (metaLines.length > 0) {
                    children.push(
                        new Paragraph({
                            children: metaLines,
                            spacing: { after: 400 },
                        })
                    );
                }
            }
        }

        if (includeToc) {
            children.push(
                new Paragraph({
                    spacing: { after: 200 },
                    children: [
                        new TextRun({
                            text: 'Table of contents',
                            bold: true,
                            size: 32,
                            color: primary,
                        }),
                    ],
                })
            );
            children.push(
                new TableOfContents('TOC', {
                    hyperlink: true,
                    headingStyleRange: '1-4',
                })
            );
            children.push(
                new Paragraph({
                    spacing: { after: 200 },
                    children: [
                        new TextRun({
                            text: 'In Word: select the TOC and choose Update Table, or press Alt+F9 to toggle fields then F9 to update.',
                            italics: true,
                            size: 18,
                            color: '666666',
                        }),
                    ],
                })
            );
            children.push(this.pageBreakParagraph());
        }

        for (const token of tokens) {
            const paragraph = await this.processTokenSafely(token);
            if (paragraph) {
                if (Array.isArray(paragraph)) {
                    children.push(...paragraph);
                } else {
                    children.push(paragraph);
                }
            }
        }

        const useStyledHeadings =
            !!options &&
            (useCover ||
                includeToc ||
                !!options.primaryColorHex ||
                !!options.secondaryColorHex ||
                !!options.logoDataUrl);

        const doc = new Document({
            features: includeToc ? { updateFields: true } : undefined,
            sections: [
                {
                    properties: {},
                    children,
                },
            ],
            styles: {
                ...(useStyledHeadings
                    ? {
                          default: {
                              heading1: { run: { color: primary, bold: true, size: 32 } },
                              heading2: { run: { color: secondary, bold: true, size: 28 } },
                              heading3: { run: { color: secondary, size: 26 } },
                          },
                      }
                    : {}),
                paragraphStyles: [
                    {
                        id: 'Normal',
                        name: 'Normal',
                        run: {
                            font: bodyFont,
                            size: bodyHalfPt,
                        },
                        paragraph: {
                            spacing: {
                                line: 276,
                                after: 200,
                            },
                        },
                    },
                ],
            },
        });

        return await Packer.toBuffer(doc);
    }

    private static async processTokenSafely(token: any): Promise<Paragraph | Paragraph[] | Table | null> {
        try {
            return await this.processToken(token);
        } catch (error) {
            const fallbackText = this.getTokenText(token);

            if (!fallbackText) {
                return null;
            }

            return new Paragraph({
                children: [new TextRun({ text: fallbackText })],
            });
        }
    }

    private static async processToken(token: any): Promise<Paragraph | Paragraph[] | Table | null> {
        switch (token.type) {
            case 'heading':
                return new Paragraph({
                    children: await this.parseInlineText(this.getInlineTokens(token)),
                    heading: this.getHeadingLevel(token.depth),
                    spacing: {
                        before: 240,
                        after: 120,
                    },
                });

            case 'paragraph':
                return new Paragraph({
                    children: await this.parseInlineText(this.getInlineTokens(token)),
                });

            case 'list':
                return this.processList(token, 0);

            case 'space':
                return null;

            case 'hr':
                return new Paragraph({
                    text: '__________________________________________________',
                    alignment: AlignmentType.CENTER,
                    spacing: { before: 200, after: 200 }
                });

            case 'html': {
                const htmlRaw = String((token as any).raw ?? (token as any).text ?? '');
                if (/<!--\s*docx-pagebreak\s*-->/i.test(htmlRaw)) {
                    return new Paragraph({
                        pageBreakBefore: true,
                        children: [],
                    });
                }
                return null;
            }

            case 'table':
                const tableRows: TableRow[] = [];
                const headerCellsSource = Array.isArray(token.header) ? token.header : [];
                const headerTokenSource = Array.isArray(token.tokens?.header) ? token.tokens.header : [];
                
                // Header row
                const headerCells: TableCell[] = [];
                for (let i = 0; i < headerCellsSource.length; i++) {
                    const headerTokens = this.getTableCellInlineTokens(headerCellsSource[i], headerTokenSource[i]);
                    headerCells.push(
                        new TableCell({
                            children: [new Paragraph({
                                children: await this.parseInlineText(headerTokens, { forceBold: true })
                            })],
                            shading: {
                                fill: "F2F2F2",
                                type: ShadingType.CLEAR,
                            },
                        })
                    );
                }
                tableRows.push(new TableRow({ children: headerCells }));

                // Body rows
                const bodyRowsSource = Array.isArray(token.rows) ? token.rows : [];
                const bodyTokenSource = Array.isArray(token.tokens?.rows) ? token.tokens.rows : [];
                for (let i = 0; i < bodyRowsSource.length; i++) {
                    const bodyCells: TableCell[] = [];
                    const row = Array.isArray(bodyRowsSource[i]) ? bodyRowsSource[i] : [];
                    const rowTokens = Array.isArray(bodyTokenSource[i]) ? bodyTokenSource[i] : [];
                    for (let j = 0; j < row.length; j++) {
                        const cellTokens = this.getTableCellInlineTokens(row[j], rowTokens[j]);
                        bodyCells.push(
                            new TableCell({
                                children: [new Paragraph({
                                    children: await this.parseInlineText(cellTokens)
                                })],
                            })
                        );
                    }
                    tableRows.push(new TableRow({ children: bodyCells }));
                }

                return new Table({
                    rows: tableRows,
                    width: {
                        size: 100,
                        type: WidthType.PERCENTAGE,
                    },
                });

            case 'image':
                try {
                    // Handle standalone image block if usage occurs, though markdown usually wraps in p
                    // But if it is a block token:
                    const imageBuffer = await this.fetchImage(token.href);
                    if (imageBuffer) {
                        return new Paragraph({
                            children: [
                                new ImageRun({
                                    data: imageBuffer,
                                    transformation: {
                                        width: 500,
                                        height: 300,
                                    },
                                    type: 'png',
                                } as any),
                            ],
                        });
                    }
                    return new Paragraph({ text: `[Image: ${token.text}]` });
                } catch (e) {
                    return new Paragraph({ text: `[Image: ${token.text} - Failed to load]` });
                }

            default:
                // Fallback for unsupported tokens: just render text if available
                if (this.getTokenText(token)) {
                    return new Paragraph({
                        children: [new TextRun(this.getTokenText(token))],
                    });
                }
                return null;
        }
    }

    private static getHeadingLevel(depth: number) {
        switch (depth) {
            case 1: return HeadingLevel.HEADING_1;
            case 2: return HeadingLevel.HEADING_2;
            case 3: return HeadingLevel.HEADING_3;
            case 4: return HeadingLevel.HEADING_4;
            case 5: return HeadingLevel.HEADING_5;
            default: return HeadingLevel.HEADING_6;
        }
    }

    private static async processList(token: any, level: number): Promise<Paragraph[]> {
        const listItems: Paragraph[] = [];

        for (const item of token.items ?? []) {
            const itemTokens = Array.isArray(item?.tokens) ? item.tokens : this.getInlineTokens(item);
            const inlineTokens = itemTokens.filter((child: any) => child?.type !== 'list');
            const nestedLists = itemTokens.filter((child: any) => child?.type === 'list');

            if (inlineTokens.length > 0) {
                listItems.push(
                    new Paragraph({
                        children: await this.parseInlineText(inlineTokens),
                        bullet: {
                            level,
                        },
                    })
                );
            }

            for (const nestedList of nestedLists) {
                listItems.push(...await this.processList(nestedList, level + 1));
            }
        }

        return listItems;
    }

    private static normalizeMarkdownForDocx(markdownContent: string): string {
        const processedMarkdown = stripInlineH8TagsForExport(markdownContent);

        const normalizedLines = processedMarkdown
            .replace(/\/&lt;/gi, '<')
            .replace(/\/&gt;/gi, '>')
            .replace(/\/&quot;/gi, '"')
            .replace(/\/&#39;|\/&apos;/gi, "'")
            .replace(/\/&\/lt;/gi, '<')
            .replace(/\/&\/gt;/gi, '>')
            .replace(/\/&quot;/gi, '"')
            .replace(/\/&#39;|\/&apos;/gi, "'")
            .replace(/&quot;/gi, '"')
            .replace(/&#39;|&apos;/gi, "'")
            .replace(/&amp;/gi, '&')
            .replace(/&lt;/gi, '<')
            .replace(/&gt;/gi, '>')
            .replace(/\\\*\\\*(?=\S)([\s\S]*?\S)\\\*\\\*/g, '**$1**')
            .replace(/(^|[^*])\\\*(?=\S)([^\n]*?\S)\\\*(?!\*)/g, '$1*$2*')
            .replace(/\\\[/g, '[')
            .replace(/\\\]/g, ']')
            .replace(/\r\n/g, '\n')
            .split('\n')
            .flatMap((line) => this.normalizeMarkdownLine(line));

        return normalizedLines.join('\n');
    }

    private static normalizeMarkdownLine(line: string): string[] {
        const normalizedBulletLine = line
            .replace(/^\s*[●•]\s*/u, '* ')
            .replace(/:\s+[✅✔☑]\s+/gu, ':\n* ')
            .replace(/\s+[✅✔☑]\s+/gu, '\n* ');

        const pseudoNestedListMatch = normalizedBulletLine.match(/^(\*\s+[^:\n]+):\s*-\s+(.+)$/);

        if (!pseudoNestedListMatch) {
            return [normalizedBulletLine];
        }

        const [, label, nestedContent] = pseudoNestedListMatch;
        const nestedItems = nestedContent
            .split(/\s+-\s+(?=(?:\*\*)?[A-Z0-9\[])/)
            .map((item) => item.trim())
            .filter(Boolean)
            .map((item) => `  - ${item}`);

        if (nestedItems.length === 0) {
            return [`${label}:`];
        }

        return [`${label}:`, ...nestedItems];
    }

    private static async parseInlineText(
        tokens: any[],
        options?: { forceBold?: boolean }
    ): Promise<(TextRun | ImageRun)[]> {
        const runs: (TextRun | ImageRun)[] = [];

        if (!tokens) return runs;

        for (const token of tokens) {
            switch (token.type) {
                case 'text':
                case 'escape':
                    if (Array.isArray(token.tokens) && token.tokens.length > 0) {
                        runs.push(...await this.parseInlineText(token.tokens, options));
                    } else {
                        runs.push(new TextRun({
                            text: this.getTokenText(token),
                            bold: options?.forceBold,
                        }));
                    }
                    break;

                case 'strong':
                    runs.push(new TextRun({
                        text: this.getTokenText(token),
                        bold: true,
                    }));
                    break;

                case 'em':
                    runs.push(new TextRun({
                        text: this.getTokenText(token),
                        italics: true,
                        bold: options?.forceBold,
                    }));
                    break;

                case 'codespan':
                    runs.push(new TextRun({
                        text: this.getTokenText(token),
                        font: 'Courier New',
                        color: '333333',
                        highlight: 'lightGray', // Use valid color
                        bold: options?.forceBold,
                    }));
                    break;

                case 'link':
                    runs.push(new TextRun({
                        text: this.getTokenText(token),
                        underline: {
                            type: UnderlineType.SINGLE,
                            color: '0563C1'
                        },
                        color: '0563C1',
                        bold: options?.forceBold,
                    }));
                    break;

                case 'html':
                    if (/^<br\s*\/?>(?:\s*)$/i.test(this.getTokenText(token).trim())) {
                        runs.push(new TextRun({
                            break: 1,
                            bold: options?.forceBold,
                        }));
                    } else if (this.getTokenText(token)) {
                        runs.push(new TextRun({
                            text: this.getTokenText(token),
                            bold: options?.forceBold,
                        }));
                    }
                    break;

                case 'image':
                    try {
                        const imageBuffer = await this.fetchImage(token.href);
                        if (imageBuffer) {
                            runs.push(
                                new ImageRun({
                                    data: imageBuffer,
                                    transformation: {
                                        width: 200, // Small inline image
                                        height: 200,
                                    },
                                    type: 'png',
                                } as any)
                            );
                        } else {
                            runs.push(new TextRun({ text: `[Image: ${this.getTokenText(token)}]` }));
                        }
                    } catch (e) {
                        runs.push(new TextRun({ text: `[Image: ${this.getTokenText(token)}]` }));
                    }
                    break;

                default:
                    if (Array.isArray(token.tokens) && token.tokens.length > 0) {
                        runs.push(...await this.parseInlineText(token.tokens, options));
                    } else if (this.getTokenText(token)) {
                        runs.push(new TextRun({
                            text: this.getTokenText(token),
                            bold: options?.forceBold,
                        }));
                    }
                    break;
            }
        }
        return runs;
    }

    private static getInlineTokens(token: any): any[] {
        if (Array.isArray(token?.tokens)) {
            return token.tokens;
        }

        return this.textToInlineTokens(this.getTokenText(token));
    }

    private static getTableCellInlineTokens(cell: any, fallbackTokens?: any): any[] {
        if (Array.isArray(fallbackTokens)) {
            return fallbackTokens;
        }

        if (Array.isArray(cell?.tokens)) {
            return cell.tokens;
        }

        return this.textToInlineTokens(this.getTokenText(cell));
    }

    private static textToInlineTokens(value: unknown): Array<{ type: 'text'; text: string }> {
        const text = this.getTokenText(value);

        return text ? [{ type: 'text', text }] : [];
    }

    private static getTokenText(token: any): string {
        if (typeof token === 'string') {
            return token;
        }

        if (typeof token?.text === 'string') {
            return token.text;
        }

        if (typeof token?.raw === 'string') {
            return token.raw;
        }

        return '';
    }

    private static async fetchImage(url: string): Promise<Buffer | null> {
        try {
            const response = await axios.get(url, { responseType: 'arraybuffer' });
            return Buffer.from(response.data);
        } catch (error) {
            console.error(`Failed to fetch image from ${url}`, error);
            return null;
        }
    }
}
