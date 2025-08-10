const nocURLs = {
    skills: "https://noc.esdc.gc.ca/SkillsTaxonomy/CategoryView?CategoryCode=F&version=2023.0",
    abilities: "https://noc.esdc.gc.ca/SkillsTaxonomy/CategoryView?CategoryCode=A&version=2023.0",
    personal_attributes: "https://noc.esdc.gc.ca/SkillsTaxonomy/CategoryView?CategoryCode=B&version=2023.0",
    interests: "https://noc.esdc.gc.ca/SkillsTaxonomy/CategoryView?CategoryCode=C&version=2023.0",
    knowledge: "https://noc.esdc.gc.ca/SkillsTaxonomy/CategoryView?CategoryCode=G&version=2023.0",
    work_context: "https://noc.esdc.gc.ca/SkillsTaxonomy/CategoryView?CategoryCode=J&version=2023.0",
    work_activities: "https://noc.esdc.gc.ca/SkillsTaxonomy/CategoryView?CategoryCode=K&version=2023.0",
}

const processTableSpan = (spanText) => {
    let text = spanText.trim();
    // Handle endnotes case
    if (text.includes('[Endnotes]')) {
        text = text.split('[Endnotes]')[0].trim();
    }

    if (text.includes('\n')) {
        const splitText = new Set(text.split('\n')); //remove duplicates
        text = Array.from(splitText).map(line => line.trim()).join(' ');
    }
    return text;
}

const processHTML = () => {

    // Final result object
    const data = {};

    document.querySelectorAll('details').forEach(detail => {
        //set the detail to open
        detail.open = true;
        // Get category name from <h2 class="h3">
        const categoryEl = detail.querySelector('summary h2.h3');
        if (!categoryEl) return; // skip if missing

        const categoryName = categoryEl.textContent.trim();

        // Object to hold descriptor/definition pairs for this category
        const categoryData = {};

        // Find all table rows inside this <details>
        detail.querySelectorAll('table tbody tr').forEach(row => {
            const cols = row.querySelectorAll('td');
            if (cols.length >= 2) {
                const key = processTableSpan(cols[0].innerText.trim());
                const value = processTableSpan(cols[1].innerText.trim());
                categoryData[key] = { descriptor: key, definition: value, category: processTableSpan(categoryName) };
            }
        });

        // Save in main object
        data[categoryName] = categoryData;
    });


    // console.log(JSON.stringify(data, null, 2));
    return data;
}


const getNOCData = async () => {
    const allData = {};
    for (const [dataType, url] of Object.entries(nocURLs)) {
        try {
            const html = await getHTML(url);
            if (!html) {
                console.error(`Failed to fetch HTML for ${dataType}`);
                continue;
            }
            const data = processHTML(html);
            allData[dataType] = data;
        } catch (error) {
            console.error(`Error fetching ${dataType}:`, error);
        }
    }
    return allData;
}


// const saveDataToFile = (data, filename = `noc_data_retrieved_${new Date().getDate().toLocaleString()}.json`) => {
//     const jsonData = JSON.stringify(data, null, 2);
//     fs.writeFileSync(filename, jsonData);
// }

const data = processHTML();