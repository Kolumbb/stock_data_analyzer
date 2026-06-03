# stock_data_analyzer
Reads financial reports (PDF/HTML), removes junk data, sends the data to the Claude API—which calculates approximately 40 metrics (margins, ROE/ROA, debt, liquidity, scorecard)—and displays the results in the terminal while saving the data as JSON.



#Dependencies instalation
pip install anthropic pdfplumber beautifulsoup4 rich

#Usage
# Only one raport
python stock_analyzer.py --quarterly 10q.htm --ticker AMD

# A few raports in the same time
python stock_analyzer.py --quarterly 10q.htm --annual 10k.pdf --ticker AMD --currency USD

# With JSON saved
python stock_analyzer.py --quarterly 10q.pdf --ticker PKO --currency PLN --output wyniki.json

# Wigth manual given API
python stock_analyzer.py --annual raport.pdf --ticker LPP --api-key sk-ant-...

# Line719 - add private api key for AI like api_key ="key..."