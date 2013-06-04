###Create TF list for Inferelator by combining JCVI, COG, and GO annotated genes.
#change the two inputs below and then run from source:
org.code = 'pf'
mo.taxId = c('186497')

mo = read.delim(paste("http://www.microbesonline.org/cgi-bin/genomeInfo.cgi?taxId=",mo.taxId,"&cogFun=K&export=tab", sep=''), header=T, sep="\t", as.is=T)

#JCVI-annotated
#from the 'Regulatory functions:Other' entries, keep only those that contain 'transcription' in the description -- too many other types of proteins
t1=c('Regulatory functions:DNA interactions','Transcription:Transcription factors','Transcription:Other')
jcvi=mo[mo[,15] == 'Regulatory functions:Other',]
jcvi=jcvi[grep("transcription", jcvi$desc, ignore.case=T),]
jcvi=rbind(jcvi,mo[mo[,15] %in% t1,])
#COG term K ('Transcription'), GO:0003700 (molecular function: transcription regulator activity: transcription factor activity) + GO:0016563 (molecular function: transcription regulator activity:transcription activator activity) + GO:0016564 (molecular function: transcription regulator activity:transcription repressor activity)
cog=mo[grep("K", mo$COGFun),]
tgo=c('0003700','0016563', '0016564')
go=mo[grep(paste(tgo,collapse="|"), mo$GO),]
jcvi.cog.go=unique(rbind(jcvi,cog,go))

##eliminate unwanted terms
t1=c('RNA helicase', 'RNA-helicase','nuclease', 'RNase', 'RNA-bind', 'RNA bind', 'transposase','partition', 'restriction', 'ribonucleoprotein', 'ParB')
jcvi.cog.go=unique(jcvi.cog.go[grep(paste(t1,collapse="|"), jcvi.cog.go$desc, invert=T, ignore.case=T),])
#eliminate 'kinase' if not also GO positive
t1=jcvi.cog.go[grep('kinase', jcvi.cog.go$desc, ignore.case=T),]
t1=t1[grep(paste(tgo,collapse="|"), t1$GO, invert=T),'sysName']
jcvi.cog.go=jcvi.cog.go[!jcvi.cog.go$sysName %in% t1,]
jcvi.cog.go=jcvi.cog.go[,c('sysName','desc','COGFun','TIGRRoles','GO')]
colnames(jcvi.cog.go)=c('Locus','description','COGFun','TIGRRoles','GO')

#remove '_' from locus names:
t1 = jcvi.cog.go[grep("_", jcvi.cog.go$Locus),]
t2=strsplit(t1$Locus,"_",fixed=TRUE)
t1$Locus=as.character(lapply(t2,FUN=function(x){paste(x[1],x[2],sep="")}))
jcvi.cog.go=rbind(jcvi.cog.go[grep("_", jcvi.cog.go$Locus, invert=T),],t1)

#manual check (optional)
#t1=c('OMIT1','OMIT2')
#jcvi.cog.go=jcvi.cog.go[!jcvi.cog.go$Locus %in% t1,]

write.table(jcvi.cog.go, paste('~/Documents/lab/network_portal/TF_lists/',org.code,'_TF_jcvi_cog_go.txt', sep=''), sep='\t', row.names = F, quote=F)