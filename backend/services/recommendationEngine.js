import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { parse } from 'csv-parse/sync';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DISEASE_WEIGHT = 3;
const AI_QUERY_WEIGHT = 4;
const VIEWED_PENALTY = 2;

const diseaseTopicMap = {
  "Breast Cancer (BRCA-related)": ["DNA Basics","Genes and Chromosomes","BRCA Genes","Breast Cancer Genetics","Genetic Testing","Family History","Inheritance Patterns","Preventive Screening","Healthy Lifestyle"],
  "Ovarian Cancer": ["BRCA Genes","Ovarian Cancer Genetics","Genetic Testing","Family History","Inheritance Patterns","Preventive Screening","Healthy Lifestyle"],
  "Colorectal Cancer (Lynch Syndrome)": ["Lynch Syndrome","DNA Basics","Genes and Chromosomes","Inheritance Patterns","Genetic Testing","Family History","Preventive Screening","Healthy Lifestyle"],
  "Thalassemia": ["DNA Basics","Genes and Chromosomes","Thalassemia","Carrier Screening","Genetic Testing","Inheritance Patterns","Family History"],
  "Sickle Cell Disease": ["DNA Basics","Sickle Cell Disease","Carrier Screening","Genetic Testing","Family History","Inheritance Patterns","Healthy Lifestyle"],
  "Cystic Fibrosis": ["DNA Basics","Cystic Fibrosis","Genes and Chromosomes","Carrier Screening","Genetic Testing","Inheritance Patterns","Family History"],
  "Huntington's Disease": ["DNA Basics","Huntington's Disease","Genetic Testing","Family History","Inheritance Patterns","Genes and Chromosomes"],
  "Muscular Dystrophy": ["DNA Basics","Muscular Dystrophy","Genetic Testing","Family History","Inheritance Patterns","Healthy Lifestyle"],
  "Hemophilia": ["DNA Basics","Hemophilia","Carrier Screening","Genetic Testing","Inheritance Patterns","Family History"],
  "Familial Hypercholesterolemia": ["Familial Hypercholesterolemia","Genetic Testing","Healthy Lifestyle","Family History","Preventive Screening","Inheritance Patterns"],
  "Psoriasis (Family History)": ["Psoriasis and Genetics","Family History","Healthy Lifestyle","Genetic Testing","Preventive Screening"],
  "Type 2 Diabetes (Family History)": ["Diabetes Genetics","Family History","Healthy Lifestyle","Preventive Screening","Genetic Testing"]
};

const aiQueryTopicMap = {
  "Genetic Testing": ["Genetic Testing","Carrier Screening","Inheritance Patterns"],
  "Family History": ["Family History","Inheritance Patterns"],
  "Lifestyle Advice": ["Healthy Lifestyle"],
  "Preventive Care": ["Preventive Screening","Healthy Lifestyle"],
  "Report Explanation": ["Genetic Testing","DNA Basics"],
  "Disease Information": [],
  "Learning Recommendation": ["Genetic Testing","Family History","Inheritance Patterns"],
  "Doctor Consultation": ["Genetic Testing","Family History"],
  "Medication Query": ["Healthy Lifestyle"],
  "Platform Support": []
};

let learningResources = [];

const loadCSV = () => {
  try {
    const csvPath = path.join(__dirname, '..', 'learning_resource_knowledge_base.csv');
    const fileContent = fs.readFileSync(csvPath, 'utf-8');
    learningResources = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    });
    console.log(`[RecommendationEngine] Loaded ${learningResources.length} learning resources`);
  } catch (error) {
    console.error('[RecommendationEngine] Failed to load CSV:', error.message);
  }
};

loadCSV();

const calculateTopicScore = (user, topic) => {
  let score = 0;
  const { disease_category, ai_query_category, learning_topic_viewed } = user;

  if (diseaseTopicMap[disease_category] && diseaseTopicMap[disease_category].includes(topic)) {
    score += DISEASE_WEIGHT;
  }

  if (ai_query_category) {
    if (ai_query_category === "Disease Information") {
      if (diseaseTopicMap[disease_category] && diseaseTopicMap[disease_category].includes(topic)) {
        score += AI_QUERY_WEIGHT;
      }
    } else if (aiQueryTopicMap[ai_query_category] && aiQueryTopicMap[ai_query_category].includes(topic)) {
      score += AI_QUERY_WEIGHT;
    }
  }

  if (learning_topic_viewed && topic === learning_topic_viewed) {
    score -= VIEWED_PENALTY;
  }

  return score;
};

const getTopicSpecificity = (user, topic) => {
  const { disease_category } = user;
  let specificity = 3;
  if (diseaseTopicMap[disease_category]) {
    if (topic === disease_category) specificity = 1;
    else if (diseaseTopicMap[disease_category].includes(topic)) specificity = 2;
  }
  return specificity;
};

export const generateRecommendations = (user, topN = 3) => {
  const topicScores = learningResources.map(resource => ({
    ...resource,
    Score: calculateTopicScore(user, resource.Learning_Topic),
    Specificity: getTopicSpecificity(user, resource.Learning_Topic)
  }));

  topicScores.sort((a, b) => {
    if (b.Score !== a.Score) return b.Score - a.Score;
    return a.Specificity - b.Specificity;
  });

  return topicScores.slice(0, topN);
};

export default { generateRecommendations };
