import { DocxService } from '../../services/docxService';
import { marked } from 'marked';
const AdmZip = require('adm-zip');

// Mock marked
jest.mock('marked', () => ({
    marked: {
        lexer: jest.fn((markdown) => {
            // Basic mock implementation
            if (!markdown) return [];
            return [
                {
                    type: 'paragraph',
                    tokens: [{ type: 'text', text: markdown }]
                }
            ];
        })
    }
}));

describe('DocxService', () => {
    beforeEach(() => {
        jest.mocked(marked.lexer).mockImplementation((markdown) => {
            if (!markdown) return [] as any;

            return [
                {
                    type: 'paragraph',
                    tokens: [{ type: 'text', text: markdown }]
                }
            ] as any;
        });
    });

    it('should generate a DOCX buffer from simple Markdown', async () => {
        const markdown = '# Hello World\nThis is a test paragraph.';
        const title = 'Test Document';

        const buffer = await DocxService.generateDocx(markdown, title);

        expect(buffer).toBeDefined();
        expect(Buffer.isBuffer(buffer)).toBe(true);
    });

    it('should handle formatting elements', async () => {
        const markdown = '**Bold**';
        const buffer = await DocxService.generateDocx(markdown, 'Format Doc');
        expect(buffer).toBeDefined();
        expect(Buffer.isBuffer(buffer)).toBe(true);
    });

    it('should render formatted markdown inside headings without literal markers', async () => {
        jest.mocked(marked.lexer).mockReturnValue([
            {
                type: 'heading',
                depth: 2,
                text: 'Section **Title**',
                tokens: [
                    { type: 'text', text: 'Section ' },
                    {
                        type: 'strong',
                        text: 'Title',
                        tokens: [{ type: 'text', text: 'Title' }]
                    }
                ]
            }
        ] as any);

        const buffer = await DocxService.generateDocx('heading', 'Format Doc');
        const zip = new AdmZip(buffer);
        const documentXml = zip.readAsText('word/document.xml');

        expect(documentXml).toContain('Section ');
        expect(documentXml).toContain('Title');
        expect(documentXml).not.toContain('**Title**');
        expect(documentXml).toContain('<w:b/>');
    });

    it('should handle metadata', async () => {
        const markdown = 'Text';
        const metadata = { Author: 'Me' };
        const buffer = await DocxService.generateDocx(markdown, 'Meta Doc', metadata);
        expect(buffer).toBeDefined();
    });

    it('should tolerate table tokens without inline token metadata', async () => {
        jest.mocked(marked.lexer).mockReturnValue([
            {
                type: 'table',
                header: ['Column A', 'Column B'],
                rows: [['Value 1', 'Value 2']],
            }
        ] as any);

        const buffer = await DocxService.generateDocx('table', 'Table Doc');

        expect(buffer).toBeDefined();
        expect(Buffer.isBuffer(buffer)).toBe(true);
    });

    it('should render nested list item bold labels instead of literal markdown markers', async () => {
        jest.mocked(marked.lexer).mockReturnValue([
            {
                type: 'list',
                ordered: false,
                items: [
                    {
                        type: 'list_item',
                        text: '**Project Name:** Online Tutoring or Coaching Platform',
                        tokens: [
                            {
                                type: 'text',
                                text: '**Project Name:** Online Tutoring or Coaching Platform',
                                tokens: [
                                    {
                                        type: 'strong',
                                        text: 'Project Name:',
                                        tokens: [
                                            {
                                                type: 'text',
                                                text: 'Project Name:',
                                            }
                                        ]
                                    },
                                    {
                                        type: 'text',
                                        text: ' Online Tutoring or Coaching Platform',
                                    }
                                ]
                            }
                        ]
                    }
                ]
            }
        ] as any);

        const buffer = await DocxService.generateDocx('list', 'Format Doc');
        const zip = new AdmZip(buffer);
        const documentXml = zip.readAsText('word/document.xml');

        expect(documentXml).toContain('Project Name:');
        expect(documentXml).toContain('Online Tutoring or Coaching Platform');
        expect(documentXml).not.toContain('**Project Name:**');
    });

    it('should render nested bullet lists with bold sub-item content without literal markers', async () => {
        jest.mocked(marked.lexer).mockReturnValue([
            {
                type: 'list',
                ordered: false,
                items: [
                    {
                        type: 'list_item',
                        tokens: [
                            {
                                type: 'text',
                                text: 'Minimum word counts met:',
                                tokens: [{ type: 'text', text: 'Minimum word counts met:' }]
                            },
                            {
                                type: 'list',
                                ordered: false,
                                items: [
                                    {
                                        type: 'list_item',
                                        tokens: [
                                            {
                                                type: 'text',
                                                text: 'Executive Summary: **250+ words**.',
                                                tokens: [
                                                    { type: 'text', text: 'Executive Summary: ' },
                                                    { type: 'strong', text: '250+ words', tokens: [{ type: 'text', text: '250+ words' }] },
                                                    { type: 'text', text: '.' }
                                                ]
                                            }
                                        ]
                                    }
                                ]
                            }
                        ]
                    }
                ]
            }
        ] as any);

        const buffer = await DocxService.generateDocx('list', 'Format Doc');
        const zip = new AdmZip(buffer);
        const documentXml = zip.readAsText('word/document.xml');

        expect(documentXml).toContain('Minimum word counts met:');
        expect(documentXml).toContain('Executive Summary: ');
        expect(documentXml).toContain('250+ words');
        expect(documentXml).not.toContain('**250+ words**');
        expect(documentXml).toContain('<w:b/>');
    });

    it('should normalize pseudo bullet lines with inline subitems before lexing', async () => {
        jest.mocked(marked.lexer).mockReturnValue([
            {
                type: 'paragraph',
                tokens: [{ type: 'text', text: 'normalized' }]
            }
        ] as any);

        const markdown = '●\tLack of Niche Specialization:- Most platforms focus on **generic subjects**. - Instructors with **specialized expertise** struggle to find platforms.';

        await DocxService.generateDocx(markdown, 'Format Doc');

        expect(marked.lexer).toHaveBeenCalledWith(
            '* Lack of Niche Specialization:\n  - Most platforms focus on **generic subjects**.\n  - Instructors with **specialized expertise** struggle to find platforms.'
        );
    });

    it('should normalize escaped emphasis markers before lexing', async () => {
        jest.mocked(marked.lexer).mockReturnValue([
            {
                type: 'paragraph',
                tokens: [{ type: 'text', text: 'normalized' }]
            }
        ] as any);

        const markdown = '(Referenced from \\*\\*User Personas Common Challenges\\*\\* and \\*\\*User Personas Project Key Roles and Needs\\*\\* documents)';

        await DocxService.generateDocx(markdown, 'Format Doc');

        expect(marked.lexer).toHaveBeenCalledWith(
            '(Referenced from **User Personas Common Challenges** and **User Personas Project Key Roles and Needs** documents)'
        );
    });

    it('should normalize escaped bold markers inside list items before lexing', async () => {
        jest.mocked(marked.lexer).mockReturnValue([
            {
                type: 'list',
                ordered: false,
                items: []
            }
        ] as any);

        const markdown = '* item with \\*\\*escaped bold\\*\\* text';

        await DocxService.generateDocx(markdown, 'Format Doc');

        expect(marked.lexer).toHaveBeenCalledWith(
            '* item with **escaped bold** text'
        );
    });

    it('should normalize escaped brackets inside pseudo-link list items before lexing', async () => {
        jest.mocked(marked.lexer).mockReturnValue([
            {
                type: 'paragraph',
                tokens: [{ type: 'text', text: 'normalized' }]
            }
        ] as any);

        const markdown = '●\tPrimary Links:- \\[Link to Online Tutoring or Coaching Platform Business Case v1.0\\] - \\[Link to Online Tutoring or Coaching Platform Strategic Alignment Document\\]';

        await DocxService.generateDocx(markdown, 'Format Doc');

        expect(marked.lexer).toHaveBeenLastCalledWith(
            '* Primary Links:\n  - [Link to Online Tutoring or Coaching Platform Business Case v1.0]\n  - [Link to Online Tutoring or Coaching Platform Strategic Alignment Document]'
        );
    });

    it('should decode common html entities before lexing', async () => {
        jest.mocked(marked.lexer).mockReturnValue([
            {
                type: 'paragraph',
                tokens: [{ type: 'text', text: 'normalized' }]
            }
        ] as any);

        const markdown = 'This project is strategically aligned with Global EdTech Solutions&#39; OKR (Objective and Key Results) of &quot;Expanding Market Reach in Specialized Learning&quot; and &quot;Diversifying Revenue Streams through Digital-First Services&quot; for fiscal year 2026.';

        await DocxService.generateDocx(markdown, 'Format Doc');

        expect(marked.lexer).toHaveBeenLastCalledWith(
            'This project is strategically aligned with Global EdTech Solutions\' OKR (Objective and Key Results) of "Expanding Market Reach in Specialized Learning" and "Diversifying Revenue Streams through Digital-First Services" for fiscal year 2026.'
        );
    });

    it('should decode malformed slash-prefixed html entities before lexing', async () => {
        jest.mocked(marked.lexer).mockReturnValue([
            {
                type: 'paragraph',
                tokens: [{ type: 'text', text: 'normalized' }]
            }
        ] as any);

        const markdown = 'Performance: /&/lt;2s page load time; /&quot;fast\' response/&quot; target; /&#39;quoted/&#39; note.';

        await DocxService.generateDocx(markdown, 'Format Doc');

        expect(marked.lexer).toHaveBeenLastCalledWith(
            'Performance: <2s page load time; "fast\' response" target; \'quoted\' note.'
        );
    });

    it('should decode slash-prefixed standard html entities before lexing', async () => {
        jest.mocked(marked.lexer).mockReturnValue([
            {
                type: 'paragraph',
                tokens: [{ type: 'text', text: 'normalized' }]
            }
        ] as any);

        const markdown = 'Performance: /&lt;2s page load time; /&quot;fast\' response/&quot; target; /&#39;quoted/&#39; note.';

        await DocxService.generateDocx(markdown, 'Format Doc');

        expect(marked.lexer).toHaveBeenLastCalledWith(
            'Performance: <2s page load time; "fast\' response" target; \'quoted\' note.'
        );
    });

    it('should normalize the enterprise limitations pseudo-list block before lexing', async () => {
        jest.mocked(marked.lexer).mockReturnValue([
            {
                type: 'paragraph',
                tokens: [{ type: 'text', text: 'normalized' }]
            }
        ] as any);

        const markdown = `2.1 Current State and Enterprise Limitations
The current state of online education is characterized by fragmented solutions, limited personalization, and high operational inefficiencies. Existing platforms like Udemy, Coursera, and Zoom-based tutoring services suffer from the following systemic limitations:
●\tLack of Niche Specialization:- Most platforms focus on **generic subjects** (e.g., basic coding, language learning), leaving a **gap in high-demand niche areas** such as **advanced AI programming, rare language tutoring, or professional certifications**. - Instructors with **specialized expertise** struggle to find platforms that cater to their unique offerings, forcing them to **compete in oversaturated markets**.
●\tPoor Monetization for Instructors:- Platforms like Udemy take **50-70% of course revenue**, leaving instructors with **minimal earnings** despite high demand for their content. - **Private coaching** is often managed manually (e.g., via Zoom and PayPal), leading to **operational inefficiencies** and **payment disputes**.`;

        await DocxService.generateDocx(markdown, 'Format Doc');

        expect(marked.lexer).toHaveBeenCalledWith(`2.1 Current State and Enterprise Limitations
The current state of online education is characterized by fragmented solutions, limited personalization, and high operational inefficiencies. Existing platforms like Udemy, Coursera, and Zoom-based tutoring services suffer from the following systemic limitations:
* Lack of Niche Specialization:
  - Most platforms focus on **generic subjects** (e.g., basic coding, language learning), leaving a **gap in high-demand niche areas** such as **advanced AI programming, rare language tutoring, or professional certifications**.
  - Instructors with **specialized expertise** struggle to find platforms that cater to their unique offerings, forcing them to **compete in oversaturated markets**.
* Poor Monetization for Instructors:
  - Platforms like Udemy take **50-70% of course revenue**, leaving instructors with **minimal earnings** despite high demand for their content.
  - **Private coaching** is often managed manually (e.g., via Zoom and PayPal), leading to **operational inefficiencies** and **payment disputes**.`);
    });

    it('should normalize inline checkmark checklist markers into bullet lines before lexing', async () => {
        jest.mocked(marked.lexer).mockReturnValue([
            {
                type: 'paragraph',
                tokens: [{ type: 'text', text: 'normalized' }]
            }
        ] as any);

        const markdown = `Why Core Values Are Critical
The Team Performance Domain (PMBOK 7) emphasizes that culture, leadership, and shared values directly impact project success. For this project, Core Values will: ✅ Mitigate Risks (e.g., Transparency reduces miscommunication; Learner-Centricity prevents scope drift). ✅ Enhance Collaboration (e.g., Respect for Expertise ensures instructors and developers work synergistically). ✅ Drive Value Delivery (e.g., Continuous Improvement ensures iterative enhancements based on user feedback). ✅ Foster Psychological Safety (e.g., Inclusivity encourages diverse perspectives from instructors, learners, and developers).`;

        await DocxService.generateDocx(markdown, 'Format Doc');

        expect(marked.lexer).toHaveBeenLastCalledWith(`Why Core Values Are Critical
The Team Performance Domain (PMBOK 7) emphasizes that culture, leadership, and shared values directly impact project success. For this project, Core Values will:
* Mitigate Risks (e.g., Transparency reduces miscommunication; Learner-Centricity prevents scope drift).
* Enhance Collaboration (e.g., Respect for Expertise ensures instructors and developers work synergistically).
* Drive Value Delivery (e.g., Continuous Improvement ensures iterative enhancements based on user feedback).
* Foster Psychological Safety (e.g., Inclusivity encourages diverse perspectives from instructors, learners, and developers).`);
    });

    it('should normalize bullet characters and encoded quotes in conflict resolution principles before lexing', async () => {
        jest.mocked(marked.lexer).mockReturnValue([
            {
                type: 'paragraph',
                tokens: [{ type: 'text', text: 'normalized' }]
            }
        ] as any);

        const markdown = `4.2 Conflict Resolution Principles
●	Focus on interests, not positions (e.g., &quot;Why is this feature important?&quot; vs. &quot;We must have this feature&quot;).
●	Separate people from the problem (e.g., &quot;The API integration is delayed&quot; vs. &quot;Alex is holding us back&quot;).
●	Use objective criteria (e.g., &quot;Does this align with our Learner-Centricity value?&quot;).
●	Document all decisions in Confluence for future reference.`;

        await DocxService.generateDocx(markdown, 'Format Doc');

        expect(marked.lexer).toHaveBeenLastCalledWith(`4.2 Conflict Resolution Principles
* Focus on interests, not positions (e.g., "Why is this feature important?" vs. "We must have this feature").
* Separate people from the problem (e.g., "The API integration is delayed" vs. "Alex is holding us back").
* Use objective criteria (e.g., "Does this align with our Learner-Centricity value?").
* Document all decisions in Confluence for future reference.`);
    });

    it('should render table header cells in bold', async () => {
        jest.mocked(marked.lexer).mockReturnValue([
            {
                type: 'table',
                header: ['Column A', 'Column B'],
                rows: [['Value 1', 'Value 2']],
            }
        ] as any);

        const buffer = await DocxService.generateDocx('table', 'Table Doc');
        const zip = new AdmZip(buffer);
        const documentXml = zip.readAsText('word/document.xml');
        const tableRows = documentXml.match(/<w:tr>.*?<\/w:tr>/gs) ?? [];
        const [headerRowXml = '', bodyRowXml = ''] = tableRows;

        expect(headerRowXml).toContain('Column A');
        expect(headerRowXml).toContain('Column B');
        expect(headerRowXml).toContain('<w:b/>');
        expect(bodyRowXml).toContain('Value 1');
        expect(bodyRowXml).not.toContain('<w:b/>');
    });

    it('should render formatted markdown inside table body cells without literal markers', async () => {
        jest.mocked(marked.lexer).mockReturnValue([
            {
                type: 'table',
                header: ['Column A', 'Column B'],
                rows: [
                    [
                        {
                            text: '**Bold Cell**',
                            tokens: [
                                {
                                    type: 'strong',
                                    text: 'Bold Cell',
                                    tokens: [{ type: 'text', text: 'Bold Cell' }]
                                }
                            ]
                        },
                        {
                            text: '*Italic Cell*',
                            tokens: [
                                {
                                    type: 'em',
                                    text: 'Italic Cell',
                                    tokens: [{ type: 'text', text: 'Italic Cell' }]
                                }
                            ]
                        }
                    ]
                ]
            }
        ] as any);

        const buffer = await DocxService.generateDocx('table', 'Table Doc');
        const zip = new AdmZip(buffer);
        const documentXml = zip.readAsText('word/document.xml');
        const tableRows = documentXml.match(/<w:tr>.*?<\/w:tr>/gs) ?? [];
        const bodyRowXml = tableRows[1] ?? '';

        expect(bodyRowXml).toContain('Bold Cell');
        expect(bodyRowXml).toContain('Italic Cell');
        expect(bodyRowXml).not.toContain('**Bold Cell**');
        expect(bodyRowXml).not.toContain('*Italic Cell*');
        expect(bodyRowXml).toContain('<w:b/>');
        expect(bodyRowXml).toContain('<w:i/>');
    });

    it('should render html break tags inside table cells as Word line breaks', async () => {
        jest.mocked(marked.lexer).mockReturnValue([
            {
                type: 'table',
                header: ['Column A'],
                rows: [
                    [
                        {
                            text: 'First line<br>Second line',
                            tokens: [
                                { type: 'text', text: 'First line' },
                                { type: 'html', text: '<br>' },
                                { type: 'text', text: 'Second line' }
                            ]
                        }
                    ]
                ]
            }
        ] as any);

        const buffer = await DocxService.generateDocx('table', 'Table Doc');
        const zip = new AdmZip(buffer);
        const documentXml = zip.readAsText('word/document.xml');
        const tableRows = documentXml.match(/<w:tr>.*?<\/w:tr>/gs) ?? [];
        const bodyRowXml = tableRows[1] ?? '';

        expect(bodyRowXml).toContain('First line');
        expect(bodyRowXml).toContain('Second line');
        expect(bodyRowXml).not.toContain('&lt;br&gt;');
        expect(bodyRowXml).not.toContain('<w:t xml:space="preserve"><br><\/w:t>');
        expect(bodyRowXml).toContain('<w:br/>');
    });
});
