export type ParsedMail = NonNullable<ParsedEmailContext['parsedEmail']>;

export const parseRawMail = async (rawMail: string): Promise<ParsedMail | undefined> => {
    try {
        const { default: PostalMime } = await import('postal-mime');
        const parsedEmail = await PostalMime.parse(rawMail);
        return {
            sender: parsedEmail.from ? `${parsedEmail.from.name} <${parsedEmail.from.address}>` : '',
            subject: parsedEmail.subject || '',
            text: parsedEmail.text || '',
            html: parsedEmail.html || '',
            headers: parsedEmail.headers || [],
            attachments: (parsedEmail.attachments || []).map((attachment) => ({
                filename: attachment.filename || 'attachment',
                mimeType: attachment.mimeType || 'application/octet-stream',
                content: typeof attachment.content === 'string'
                    ? new TextEncoder().encode(attachment.content)
                    : new Uint8Array(attachment.content),
                disposition: attachment.disposition || 'attachment',
            })),
        };
    } catch (error) {
        console.error('Failed use PostalMime to parse email', error);
        return undefined;
    }
};
