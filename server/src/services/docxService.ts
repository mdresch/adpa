
import {
    Document,
    Packer,
    Paragraph,
    TextRun,
    HeadingLevel,
    AlignmentType,
    UnderlineType,
    convertInchesToTwip
} from 'docx';
import { marked } from 'marked';

export class DocxService {
    /**
     * Generates a DOCX buffer from Markdown content.
     */
    static async generateDocx(
        markdownContent: string,
        title: string,
        metadata?: Record<string, any>
    ): Promise<Buffer> {
        // 1. Parse Markdown into tokens
        const tokens = marked.lexer(markdownContent);

        // 2. Create Document sections
        const children: (Paragraph)[] = [];

        // Add Title
        children.push(
            new Paragraph({
                text: title,
                heading: HeadingLevel.TITLE,
                alignment: AlignmentType.CENTER,
                spacing: {
                    after: 400, // 20pt
                },
            })
        );

        // Add Metadata if present
        if (metadata) {
            const metaLines: TextRun[] = [];
            for (const [key, value] of Object.entries(metadata)) {
                metaLines.push(
                    new TextRun({
                        text: `${key}: ${value}`,
                        bold: true,
                        size: 20, // 10pt
                    }),
                    new TextRun({
                        text: '\n',
                    })
                );
            }
            if (metaLines.length > 0) {
                children.push(new Paragraph({
                    children: metaLines,
                    spacing: {
                        after: 400,
                    }
                }));
            }
        }

        // 3. Process Tokens
        for (const token of tokens) {
            const paragraph = this.processToken(token);
            if (paragraph) {
                if (Array.isArray(paragraph)) {
                    children.push(...paragraph);
                } else {
                    children.push(paragraph);
                }
            }
        }

        // 4. Create Document
        const doc = new Document({
            sections: [{
                properties: {},
                children: children,
            }],
            styles: {
                paragraphStyles: [
                    {
                        id: 'Normal',
                        name: 'Normal',
                        run: {
                            font: 'Calibri',
                            size: 24, // 12pt
                        },
                        paragraph: {
                            spacing: {
                                line: 276, // 1.15 spacing
                                after: 200, // 10pt
                            },
                        },
                    },
                ],
            },
        });

        // 5. Generate Buffer
        return await Packer.toBuffer(doc);
    }

    private static processToken(token: any): Paragraph | Paragraph[] | null {
        switch (token.type) {
            case 'heading':
                return new Paragraph({
                    text: token.text,
                    heading: this.getHeadingLevel(token.depth),
                    spacing: {
                        before: 240,
                        after: 120,
                    },
                });

            case 'paragraph':
                return new Paragraph({
                    children: this.parseInlineText(token.tokens || []),
                });

            case 'list':
                const listItems: Paragraph[] = [];
                token.items.forEach((item: any) => {
                    listItems.push(
                        new Paragraph({
                            children: this.parseInlineText(item.tokens || []),
                            bullet: {
                                level: 0,
                            },
                        })
                    );
                });
                return listItems;

            case 'space':
                return null;

            case 'hr':
                return new Paragraph({
                    text: '__________________________________________________',
                    alignment: AlignmentType.CENTER,
                    spacing: { before: 200, after: 200 }
                });

            default:
                // Fallback for unsupported tokens: just render text if available
                if (token.text) {
                    return new Paragraph({
                        children: [new TextRun(token.text)],
                    });
                }
                return null;
        }
    }

    private static getHeadingLevel(depth: number): HeadingLevel {
        switch (depth) {
            case 1: return HeadingLevel.HEADING_1;
            case 2: return HeadingLevel.HEADING_2;
            case 3: return HeadingLevel.HEADING_3;
            case 4: return HeadingLevel.HEADING_4;
            case 5: return HeadingLevel.HEADING_5;
            default: return HeadingLevel.HEADING_6;
        }
    }

    private static parseInlineText(tokens: any[]): TextRun[] {
        const runs: TextRun[] = [];

        if (!tokens) return runs;

        for (const token of tokens) {
            switch (token.type) {
                case 'text':
                case 'escape':
                    runs.push(new TextRun({
                        text: token.text,
                    }));
                    break;

                case 'strong':
                    runs.push(new TextRun({
                        text: token.text,
                        bold: true,
                    }));
                    break;

                case 'em':
                    runs.push(new TextRun({
                        text: token.text,
                        italics: true,
                    }));
                    break;

                case 'codespan':
                    runs.push(new TextRun({
                        text: token.text,
                        font: 'Courier New',
                        color: '333333',
                        highlight: 'f5f5f5', // Basic highlight simulation
                    }));
                    break;

                case 'link':
                    runs.push(new TextRun({
                        text: token.text,
                        underline: {
                            type: UnderlineType.SINGLE,
                            color: '0563C1'
                        },
                        color: '0563C1'
                    }));
                    break;

                default:
                    if (token.text) {
                        runs.push(new TextRun({
                            text: token.text,
                        }));
                    }
                    break;
            }
        }
        return runs;
    }
}
