import requests
from bs4 import BeautifulSoup
import json
from datetime import datetime, timedelta
from urllib.parse import urljoin
from collections import defaultdict

def run_scraper():
    base_url = "https://www.new.sahamidx.com"
    current_url = "https://www.new.sahamidx.com/?/deviden"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    }

    target_cutoff_date = datetime(2024, 12, 31)
    
    raw_extracted_data = []
    reached_target = False
    page_count = 1

    print(f"🚀 Initiating scraper for {base_url}...")
    print(f"🛑 Stop condition: Payment Date <= {target_cutoff_date.strftime('%d-%b-%Y')}\n")

    # --- Phase 1: Raw Extraction Loop ---
    while current_url and not reached_target:
        print(f"Scraping Page {page_count}: {current_url}")
        
        try:
            response = requests.get(current_url, headers=headers, timeout=15)
            response.raise_for_status()
        except requests.exceptions.RequestException as e:
            print(f"❌ Failed to fetch {current_url}: {e}")
            break

        soup = BeautifulSoup(response.text, 'html.parser')
        
        table = None
        for tbl in soup.find_all("table"):
            if "Cum Date" in tbl.text or "Payment Date" in tbl.text:
                table = tbl
                break
                
        if not table:
            print("⚠️ Could not find the dividend table on this page. Stopping.")
            break

        rows = table.find_all("tr")
        if not rows or len(rows) < 2:
            print("⚠️ Table is empty. Stopping.")
            break
            
        headers_row = rows[0].find_all(["th", "td"])
        header_texts = [h.text.strip().lower() for h in headers_row]
        
        try:
            payment_idx = next(i for i, h in enumerate(header_texts) if "payment" in h)
            cum_idx = next(i for i, h in enumerate(header_texts) if "cum" in h)
            ex_idx = next(i for i, h in enumerate(header_texts) if "ex " in h)
            amount_idx = next(i for i, h in enumerate(header_texts) if "amount" in h)
        except StopIteration:
            amount_idx, cum_idx, ex_idx, payment_idx = 1, 2, 3, 5 

        for row in rows[1:]:
            cols = row.find_all("td")
            if len(cols) < 5:
                continue
                
            cols_text = [c.text.strip() for c in cols]
            
            ticker = cols_text[0]
            amount_str = cols_text[amount_idx] if amount_idx < len(cols_text) else "0"
            cum_date_str = cols_text[cum_idx] if cum_idx < len(cols_text) else ""
            ex_date_str = cols_text[ex_idx] if ex_idx < len(cols_text) else ""
            payment_date_str = cols_text[payment_idx] if payment_idx < len(cols_text) else ""
            
            # Temporary storage to be processed in Phase 2
            raw_extracted_data.append({
                "ticker": ticker,
                "amount_str": amount_str,
                "cum_date": cum_date_str,
                "ex_date": ex_date_str,
                "payment_date": payment_date_str
            })

            # Check stop condition mid-scrape
            if payment_date_str:
                try:
                    p_date_obj = datetime.strptime(payment_date_str, "%d-%b-%Y")
                    if p_date_obj <= target_cutoff_date:
                        print(f"\n🛑 Reached target date limit ({payment_date_str}) on ticker {ticker}.")
                        reached_target = True
                        break
                except ValueError:
                    pass

        if reached_target:
            break

        # Pagination logic
        next_link = None
        for a in soup.find_all('a'):
            if a.text.strip() == '›' or 'Next' in a.text or a.text.strip() == '>':
                next_link = a.get('href')
                break
                
        if next_link:
            current_url = urljoin(base_url, next_link)
            page_count += 1
        else:
            print("No next page link found. End of pagination.")
            break

    print("\n⚙️ Processing and mapping data against strict schema rules...")

    # --- Phase 2: Schema Processing & Logic Application ---
    
    # 2A. First pass to group payouts by Ticker + Year for Frequency calculation
    dividend_history = defaultdict(list)
    
    for item in raw_extracted_data:
        ticker = item["ticker"]
        p_date_str = item["payment_date"]
        
        try:
            clean_amount = float(item["amount_str"].replace(',', ''))
        except ValueError:
            clean_amount = 0.0
            
        item["clean_amount"] = clean_amount # Cache it so we don't recalculate
        
        try:
            year = datetime.strptime(p_date_str, "%d-%b-%Y").year
            group_key = f"{ticker}_{year}"
            dividend_history[group_key].append(clean_amount)
        except ValueError:
            pass

    structured_entries = []
    distinct_companies = set()

    # 2B. Final mapping pass
    for item in raw_extracted_data:
        ticker = item["ticker"]
        amount = item["clean_amount"]
        payment_date_str = item["payment_date"]
        
        extracted_year = 0
        record_date_str = ""
        status = "projected"
        
        # 1. Status Logic & Record Date Imputation
        if payment_date_str:
            try:
                p_date_obj = datetime.strptime(payment_date_str, "%d-%b-%Y")
                extracted_year = p_date_obj.year
                
                # Payment in 2026 is 'paid', else 'projected'
                if extracted_year == 2026:
                    status = "paid"
                else:
                    status = "projected"
                    
                # Calculate record date (payment - 1 day)
                r_date_obj = p_date_obj - timedelta(days=1)
                record_date_str = r_date_obj.strftime("%d-%b-%Y")
                
            except ValueError:
                pass

        # 2. Frequency Engine Logic
        frequency = "annual"
        group_key = f"{ticker}_{extracted_year}"
        
        if group_key in dividend_history:
            yearly_payouts = dividend_history[group_key]
            
            if len(yearly_payouts) > 1:
                max_payout = max(yearly_payouts)
                # If this item's amount matches the largest payout for the year, it's final
                if amount == max_payout:
                    frequency = "final"
                else:
                    frequency = "interim"

        # 3. Handle Company Name Extraction (if available from source)
        # Assuming we fallback to ticker if the scraper couldn't find a distinct column
        company_name = ticker 
        distinct_companies.add(company_name)

        # Build final compliant object
        entry = {
            "ticker": ticker,
            "company_name": company_name,
            "currency": "IDR",
            "amount": amount,
            "cum_date": item["cum_date"],
            "ex_date": item["ex_date"],
            "record_date": record_date_str,
            "payment_date": payment_date_str,
            "frequency": frequency,
            "year": extracted_year,
            "status": status
        }
        
        structured_entries.append(entry)

    # --- Phase 3: Export Pipelines ---
    
    # Export 1: The Main Dividend Payload
    main_output = "sahamidx_dividends.json"
    with open(main_output, "w") as f:
        json.dump(structured_entries, f, indent=2)
    print(f"💾 Core payload saved to '{main_output}' ({len(structured_entries)} items)")

    # Export 2: Distinct Companies List
    company_output = "distinct_companies.json"
    with open(company_output, "w") as f:
        json.dump(sorted(list(distinct_companies)), f, indent=2)
    print(f"💾 Distinct companies list saved to '{company_output}' ({len(distinct_companies)} items)")


if __name__ == "__main__":
    run_scraper()