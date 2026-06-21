import datetime
import re
from sqlalchemy import Column, String, DateTime, ForeignKey, Text
from app.core.database import Base

class BiasCorrection(Base):
    __tablename__ = "bias_corrections"

    id = Column(String, primary_key=True, index=True)
    worksheet_id = Column(String, ForeignKey("worksheets.id"), nullable=False)
    question_text = Column(Text, nullable=True)
    expected_answer = Column(Text, nullable=True)
    student_answer = Column(Text, nullable=True)
    original_ai_grade = Column(String, nullable=True)
    teacher_corrected_grade = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class AlgorithmicBiasMitigator:
    """
    Acts as a middleware post-OCR and pre-LLM to fix dialectal and regional 
    transliteration errors that disproportionately affect rural handwriting models.
    """
    
    # Common phonetic confusions in Indic scripts (Tamil, Hindi, Telugu) when translated to English by OCR
    INDIC_PHONETIC_MAP = {
        r'\b[sS]chool\b': 'school',  # OCR often misreads handwritten 'sc' as 's'
        r'\b[vV]idyalaya\b': 'school', # Direct semantic mapping
        r'\b[sS]kool\b': 'school',   # Phonetic spelling by rural students
        r'\b[tT]eecha\b': 'teacher',
        r'\b[mM]addam\b': 'madam',
        r'\b[sS]aar\b': 'sir',
        r'\b[hH]omewrk\b': 'homework',
        r'\b[pP]encil\b': 'pencil',
        r'\b[bB]ook\b': 'book',
        r'\b[bB]uk\b': 'book'
    }

    @staticmethod
    def apply_indic_transliteration_correction(raw_text: str) -> str:
        """
        Applies Regex-based phonetic mapping to prevent the LLM from penalizing 
        students for regional accents or common Indic-to-English transliteration gaps.
        """
        if not raw_text:
            return ""
            
        corrected_text = raw_text
        for pattern, replacement in AlgorithmicBiasMitigator.INDIC_PHONETIC_MAP.items():
            # Apply case-insensitive regex substitution
            corrected_text = re.sub(pattern, replacement, corrected_text, flags=re.IGNORECASE)
            
        return corrected_text
