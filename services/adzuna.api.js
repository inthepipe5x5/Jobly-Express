

const getAdzunaConfig = (removePrefix = false) => {
    const adzunaConfig = Object.entries(process.env)
        .filter(([key]) => key.startsWith("ADZUNA_"))
        .reduce((config, [key, value]) => {
            config[key] = value;
            return config;
        }, {});

    if (!adzunaConfig.ADZUNA_API_KEY || !adzunaConfig.ADZUNA_API_APP_ID) {
        throw new Error("Missing ADZUNA_API_KEY or ADZUNA_API_APP_ID in environment variables");
    }

    // Ensure the base URL is set correctly
    adzunaConfig.ADZUNA_API_BASE_URL = process.env.ADZUNA_API_BASE_URL || "http://api.adzuna.com/v1/api";
    if (removePrefix) {
        // Remove the "ADZUNA_" prefix from keys
        Object.keys(adzunaConfig).forEach(key => {
            if (key.startsWith("ADZUNA_API")) {
                const newKey = key.replace("ADZUNA_API", "");
                adzunaConfig[newKey] = adzunaConfig[key];
                delete adzunaConfig[key];
            }
        });
    }
    return adzunaConfig;
};

const getAdzunaApiUrl = (endpoint) => {
    const config = getAdzunaConfig();
    if (!config.ADZUNA_API_BASE_URL) {
        throw new Error("ADZUNA_API_BASE_URL is not set in environment variables");
    }
    return `${config.ADZUNA_API_BASE_URL}/${endpoint}`;
}

class AdzunaApi {
    apiCallCount = 0; // Track the number of API calls made
    constructor(config = null, country = "ca", region = "on", city = "toronto", coordinates = null) {
        this.config = config ?? getAdzunaConfig();
        this.country = country; // Default to Canada // 2 char ISO 8601 country code of the country of interest
        this.region = region;
        this.city = city;
        this.coordinates = coordinates;

        if (!!!this.config.PLAN || this.config.PLAN === "free") {
            this.dailyApiCallLimit = 250; // Free plan limit
        } this.dailyApiCallLimit = null; // No limit for other plans
        this.apiCallCount = 0; // Initialize API call count
    }

    async baseJobSearch({ searchTerms,
        category,
        sort_dir = null,
        sort_by = "relevance",
        page = 1,
        resultsPerPage = 20,
        distance_in_km = null,
        salaryMinInt = null,
        salaryMaxInt = null,
        salaryMaxBool = null,
        fullTimeJobsOnly = false,
        partTimeJobsOnly = false,
        contractJobsOnly = false,
        permanentJobsOnly = false,
        whatOr
    } = {
            sort_by: "relevance",
            page: 1,
            resultsPerPage: 20,
            distance_in_km: null
        }) {
        // Check API call limit before proceeding
        this.checkApiCallLimit();

        // Validate input parameters
        const url = new URL(getAdzunaApiUrl("jobs") + `/${this.country}/search/1`);
        const initParams = {
            app_id: this.config.ADZUNA_API_APP_ID,
            app_key: this.config.ADZUNA_API_KEY,
        };
        switch (true) {
            case Boolean(searchTerms):
                initParams.what = searchTerms;
            case Boolean(category):
                initParams.category = category;
            case Boolean(distance_in_km) && distance_in_km >= 0:
                // Only add distance if it's a valid number
                initParams.distance = distance_in_km;
            case Boolean(sort_dir) && ["up", "down"].includes(sort_dir):
                initParams.sort_dir = sort_dir;
            case Boolean(sort_by) && ["default", "hybrid", "date", "relevance", "salary"].includes(sort_by):
                initParams.sort_by = sort_by;
            case Boolean(salaryMinInt) && salaryMinInt >= 0:
                initParams.salary_min = salaryMinInt;
            case Boolean(salaryMaxInt) && salaryMaxInt >= 0:
                initParams.salary_max = salaryMaxInt;
            case Boolean(salaryMaxBool) && [true, false, 1, "1"].includes(salaryMaxBool):
                //normalize to '1' 
                let includeJobsWithKnownSalaryFlag = salaryMaxBool === true || salaryMaxBool === 1;
                initParams.salary_max_bool = includeJobsWithKnownSalaryFlag;
            // case Boolean(ll):
            //     initParams.ll = ll; // Latitude and Longitude
            case Boolean(page):
                initParams.page = page;
            case Boolean(resultsPerPage):
                initParams.results_per_page = resultsPerPage;
            case Boolean(this.country):
                initParams.location0 = this.country;
            case Boolean(this.region):
                initParams.location1 = this.region;
            case Boolean(this.city):
                initParams.location2 = this.city;
            case Boolean(this.coordinates):
                initParams.location3 = this.coordinates;

            case Boolean(fullTimeJobsOnly):
                initParams.full_time = "1";
                if (partTimeJobsOnly || contractJobsOnly || permanentJobsOnly) {
                    throw new Error("Cannot filter for full-time jobs while also filtering for part-time, contract, or permanent jobs.");
                }
            case Boolean(partTimeJobsOnly):
                initParams.part_time = "1";
                if (fullTimeJobsOnly || contractJobsOnly || permanentJobsOnly) {
                    throw new Error("Cannot filter for part-time jobs while also filtering for full-time, contract, or permanent jobs.");
                }
            case Boolean(contractJobsOnly):
                initParams.contract = "1";
                if (fullTimeJobsOnly || partTimeJobsOnly || permanentJobsOnly) {
                    throw new Error("Cannot filter for contract jobs while also filtering for full-time, part-time, or permanent jobs.");
                }
            case Boolean(permanentJobsOnly):
                initParams.permanent = "1";
                if (fullTimeJobsOnly || partTimeJobsOnly || contractJobsOnly) {
                    throw new Error("Cannot filter for permanent jobs while also filtering for full-time, part-time, or contract jobs.");
                }
            default:
                break;
        }

        const params = new URLSearchParams(initParams);

        url.search = params.toString();

        try {
            const response = await fetch(url.toString(), {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                },
            });

            if (!response.ok) {
                throw new Error(`Error fetching jobs from ${url.toString()} with params: ${JSON.stringify(initParams, null, 2)}: ${response.statusText}`);
            }
        }
        catch (error) {
            console.error(`Error fetching jobs from ${url.toString()}:`, error);
            throw error;
        }

        let data = await response.json();
        // Check if the response has results and process them
        if (!data || typeof data !== 'object') {
            throw new Error("Unexpected response format from Adzuna API");
        }
        if (Boolean(data?.results)) {
            data.results = this.preProcessResults(data);
        }
        return data;
    }

    preProcessResults(response) {
        //turn every string "0" and "1" into a boolean
        for (const key in response) {
            if (response[key] === "0") {
                response[key] = false;
            } else if (response[key] === "1") {
                response[key] = true;
            }
        }

        //the results are an object
        const { results } = response;
        if (!Array.isArray(results)) {
            throw new Error("Unexpected response format");
        }
        // Using map for better performance and clarity on large datasets
        return results.map(job => {
            // Convert "0" and "1" strings to boolean
            const newJob = { ...job };
            for (const key in newJob) {
                if (newJob[key] === "0") {
                    newJob[key] = false;
                } else if (newJob[key] === "1") {
                    newJob[key] = true;
                } else if (key === "__CLASS__") {
                    // Remove the __CLASS__ key
                    delete newJob[key];

                } else {
                    newJob[key] = newJob[key].trim();
                }
            }
            return newJob;
        });
    }
    async getJobDetails(id) {
        if (!id) {
            throw new Error("Job ID is required to fetch job details");
        }
        const url = new URL(getAdzunaApiUrl("jobs") + `/${this.country}/` + id);
        const initParams = {
            app_id: this.config.ADZUNA_API_APP_ID,
            app_key: this.config.ADZUNA_API_KEY,
        };

        url.search = new URLSearchParams(initParams).toString();
        try {
            const response = await fetch(url.toString(), {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                },
            });
            if (!response.ok) {
                throw new Error(`Error fetching job details from ${url.toString()}: ${response.statusText}`);
            }
            const data = await response.json();
            if (!data || typeof data !== 'object') {
                throw new Error("Unexpected response format from Adzuna API");
            }
            console.log("Job details fetched successfully:", JSON.stringify(data, null, 2));
            // Process the job details if needed
            return this.preProcessResults({ results: [data] })[0]; // Return the first job in the results
        } catch (error) {
            console.error(`Error fetching job details from ${url.toString()}:`, error);
            throw error;
        }
    }

    checkApiCallLimit() {
        // Check if the daily API call limit is set and if the count exceeds it
        //skip this check if the dailyApiCallLimit is not set or is 0
        if (!!!this.dailyApiCallLimit || this.dailyApiCallLimit <= 0) return;

        if (this.apiCallCount >= this.dailyApiCallLimit) {
            throw new Error(`API call limit of ${this.dailyApiCallLimit} reached for today.`);
        }
        this.apiCallCount++;
        console.log(`API call count: ${this.apiCallCount}/${this.dailyApiCallLimit}`);
    }
}