import { categorizeRequest } from '$lib/detection';
import { queryIPAddress } from '$lib/ipapi';
import supabase from '$lib/supabase';
import { UAParser } from 'ua-parser-js';

const saveRequest = async (
    pathname,
    ip_address,
    useragent,
    headers,
    referer,
    query
) => {
    // Pega os dados do IP.
    const ip_details = await queryIPAddress(ip_address);

    // Pega os dados do useragent.
    const { browser, os, device, engine, cpu } = UAParser(useragent);

    const detection = categorizeRequest(useragent, headers);

    // Cria o registro no banco de dados.
    const { data, error } = await supabase
        .from("requests")
        .insert({
            pathname: pathname,
            ip_address: ip_address,
            useragent: useragent,
            headers: headers,
            query: query,
            referer: referer,
            is_tor: ip_details?.is_tor,
            is_vpn: ip_details?.is_vpn,
            is_proxy: ip_details?.is_proxy,
            is_crawler: ip_details?.is_crawler,
            is_datacenter: ip_details?.is_datacenter,
            is_satellite: ip_details?.is_satellite,
            is_mobile: ip_details?.is_mobile,
            datacenter_domain: ip_details?.datacenter?.datacenter,
            company_name: ip_details?.company?.name,
            company_domain: ip_details?.company?.domain,
            company_type: ip_details?.company?.type,
            asn_number: ip_details?.asn?.asn,
            asn_name: ip_details?.asn?.descr,
            asn_domain: ip_details?.asn?.domain,
            asn_type: ip_details?.asn?.type,
            location_country: ip_details?.location?.country,
            location_region: ip_details?.location?.state,
            location_city: ip_details?.location?.city,
            device_vendor: device?.vendor,
            device_model: device?.model,
            browser_name: browser?.name,
            browser_version: browser?.version,
            os_name: os?.name,
            os_version: os?.version,
            cpu_architecture: cpu?.architecture,
            engine_name: engine?.name,
            engine_version: engine?.version,
            detection: detection
        })
        .select()
        .single();

    if(error) throw console.error(`Error on saveRequest: `, error);
    return data;
}

export const handle = async ({ event, resolve }) => {
    // Pega os dados da requisicao.
    const { pathname } = event.url;

    const ip_address = event.getClientAddress?.() || event.request.headers.get("x-forwarded-for")?.split(",")[0] || null;
    const useragent = event.request.headers.get("user-agent");
    const referer = event.request.headers.get("referer");
    const query = Object.fromEntries(event.url.searchParams.entries());

    if(pathname == "/api/collect" || useragent.toLocaleLowerCase().includes("vercel")) return resolve(event);

    let headers = Object.fromEntries(event.request.headers.entries());
    delete headers["accept"];
    delete headers["user-agent"];
    delete headers["host"];
    delete headers["connection"];
    delete headers["referer"];
    delete headers["cache-control"];

    // Salva a requisicao no banco de dados.
    event.locals.request = await saveRequest(pathname, ip_address, useragent, headers, referer, query);

    // Resolve a requisicao.
    return resolve(event);
}