import { parseRawMail as parseWithPostalMime, type ParsedMail } from './mail_parser_postal';

export const parseRawMail = async (rawMail: string): Promise<ParsedMail | undefined> => {
    try {
        const { parse_message_wrapper: parseMessage } = await import('mail-parser-wasm-worker');
        const parsedEmail = parseMessage(rawMail);
        const headers = parsedEmail.headers;
        const attachments = parsedEmail.attachments;
        try {
            return {
                sender: parsedEmail.sender || '',
                subject: parsedEmail.subject || '',
                text: parsedEmail.text || '',
                html: parsedEmail.body_html || '',
                headers: headers.map((header) => ({ key: header.key, value: header.value })),
                attachments: attachments.map((attachment) => ({
                    filename: attachment.filename || 'attachment',
                    mimeType: attachment.content_type || 'application/octet-stream',
                    content: new Uint8Array(attachment.content),
                    disposition: 'attachment',
                })),
            };
        } finally {
            headers.forEach((header) => header.free());
            attachments.forEach((attachment) => attachment.free());
            parsedEmail.free();
        }
    } catch (error) {
        console.error('Failed use mail-parser-wasm-worker to parse email', error);
        return parseWithPostalMime(rawMail);
    }
};
