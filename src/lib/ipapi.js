import { IPAPI_TOKEN } from "$env/static/private";

export const queryIPAddress = async (ip_address) => {
    try {
        const response = await fetch(`https://api.ipapi.is?q=${ip_address}&key=${IPAPI_TOKEN}`, {
            method: 'POST'
        });
    
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response?.status}`);
        }
    
        return (await response.json());
    }
    catch (error) {
        console.error('Erro ao fazer requisição:', error);
        return {};
    }
}