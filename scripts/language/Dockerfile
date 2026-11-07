FROM ubuntu@sha256:66460d557b25769b102175144d538d88219c077c678a49af4afca6fbfc1b5252
RUN apt-get update && apt-get install -y --no-install-recommends hunspell=1.7.2+really1.7.2-10build3 \
    && rm -rf /var/lib/apt/lists/*
ENV LANG=C.UTF-8
ENTRYPOINT ["hunspell"]
