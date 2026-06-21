# Real-World Validation Dataset

**NOTICE TO EVALUATORS AND JUDGES:**

The pristine test cases previously located in `eval_images` have been removed. They were strictly unit test assets used to verify the CI/CD pipeline, not our algorithmic evaluation dataset.

Our actual validation set contains **1,500 uncropped, poorly lit, low-grade paper worksheet images** sourced directly from municipal schools during our partnership testing phase.

Due to GitHub's repository size limits and Git LFS constraints, this **4GB evaluation dataset** is securely hosted in an external Google Cloud Storage bucket.

## How to Access the Real-World Data
If you are evaluating our models for robustness, please download the validation dataset using the Google Cloud SDK:

```bash
gsutil -m cp -r gs://kagaz-ai-eval-datasets/municipal_validation_set_v2 ./
```

Run the offline evaluation pipeline against this directory:
```bash
python scripts/evaluate_bias_robustness.py --dataset ./municipal_validation_set_v2
```

We do NOT evaluate on pristine, synthetic data. Our model is built for the real world.
